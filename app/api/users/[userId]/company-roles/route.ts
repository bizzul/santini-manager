import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) => {
    try {
        const supabase = await createClient();
        const userContext = await getUserContext();

        if (!userContext) {
            return NextResponse.json({ error: "Non autorizzato" }, {
                status: 401,
            });
        }

        const { userId } = await params;
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get("site_id");

        // First, get the User.id from authId
        const { data: userData, error: userError } = await supabase
            .from("User")
            .select("id")
            .eq("authId", userId)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: "Utente non trovato" }, {
                status: 404,
            });
        }

        const userDbId = userData.id;

        // Get user's company roles with role details
        const { data: userRoleLinks, error } = await supabase
            .from("_RolesToUser")
            .select("A, B")
            .eq("B", userDbId);

        if (error) throw error;

        // Get role details for the assigned roles
        if (userRoleLinks && userRoleLinks.length > 0) {
            const roleIds = userRoleLinks.map((link: any) => link.A);
            
            let rolesQuery = supabase
                .from("Roles")
                .select("*")
                .in("id", roleIds);
            
            // Filter by site if provided
            if (siteId) {
                rolesQuery = rolesQuery.or(`site_id.eq.${siteId},site_id.is.null`);
            }

            const { data: roles, error: rolesError } = await rolesQuery;
            
            if (rolesError) throw rolesError;

            return NextResponse.json({ 
                userRoles: userRoleLinks,
                roles: roles || []
            });
        }

        return NextResponse.json({ userRoles: [], roles: [] });
    } catch (err: any) {
        console.error("Error fetching user roles:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};

export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) => {
    try {
        const supabase = await createClient();
        const userContext = await getUserContext();

        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Only allow admin and superadmin access
        if (userContext.role !== "admin" && userContext.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { userId } = await params;
        const { roleId } = await req.json();

        if (!roleId) {
            return NextResponse.json({ error: "Role ID is required" }, {
                status: 400,
            });
        }

        // First, get the User.id from authId
        const { data: userData, error: userError } = await supabase
            .from("User")
            .select("id")
            .eq("authId", userId)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: "User not found" }, {
                status: 404,
            });
        }

        const userDbId = userData.id;

        // Check if user already has this role
        const { data: existingRole, error: checkError } = await supabase
            .from("_RolesToUser")
            .select("*")
            .eq("A", roleId)
            .eq("B", userDbId);

        if (checkError) throw checkError;

        if (existingRole && existingRole.length > 0) {
            return NextResponse.json({ error: "User already has this role" }, {
                status: 400,
            });
        }

        // Assign the role to the user
        const { data: userRole, error } = await supabase
            .from("_RolesToUser")
            .insert({ A: roleId, B: userDbId })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ userRole });
    } catch (err: any) {
        console.error("Error assigning role to user:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};

export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) => {
    try {
        const supabase = await createClient();
        const userContext = await getUserContext();

        if (!userContext) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Only allow admin and superadmin access
        if (userContext.role !== "admin" && userContext.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { userId } = await params;
        const { roleId } = await req.json();

        if (!roleId) {
            return NextResponse.json({ error: "Role ID is required" }, {
                status: 400,
            });
        }

        // First, get the User.id from authId
        const { data: userData, error: userError } = await supabase
            .from("User")
            .select("id")
            .eq("authId", userId)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: "User not found" }, {
                status: 404,
            });
        }

        const userDbId = userData.id;

        // Remove the role from the user
        const { error } = await supabase
            .from("_RolesToUser")
            .delete()
            .eq("A", roleId)
            .eq("B", userDbId);

        if (error) throw error;

        return NextResponse.json({ message: "Role unassigned successfully" });
    } catch (err: any) {
        console.error("Error unassigning role from user:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};
