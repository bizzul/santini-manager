import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export const PATCH = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
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

        const { id } = await params;
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Role name is required" }, {
                status: 400,
            });
        }

        const { data: role, error } = await supabase
            .from("Roles")
            .update({ name })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ role });
    } catch (err: any) {
        console.error("Error updating role:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};

export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
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

        const { id } = await params;

        // First, remove all user-role relationships for this role
        const { error: deleteRelationsError } = await supabase
            .from("_RolesToUser")
            .delete()
            .eq("A", id);

        if (deleteRelationsError) {
            console.error(
                "Error deleting role relationships:",
                deleteRelationsError,
            );
            // Continue with role deletion even if relationship deletion fails
        }

        // Then delete the role
        const { error } = await supabase
            .from("Roles")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ message: "Role deleted successfully" });
    } catch (err: any) {
        console.error("Error deleting role:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};
