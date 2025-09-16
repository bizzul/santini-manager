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
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        const { userId } = await params;

        // Check if the user is requesting their own roles or if they have admin privileges
        const isOwnProfile = userContext.userId === userId;
        const isAdmin = userContext.role === "admin" ||
            userContext.role === "superadmin";

        if (!isOwnProfile && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // First, get the User.id from authId
        const { data: userData, error: userError } = await supabase
            .from("User")
            .select("id")
            .eq("id", userId)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: "User not found" }, {
                status: 404,
            });
        }

        const userDbId = userData.id;

        // Get user's assigned roles with role details
        const { data: userRoles, error } = await supabase
            .from("_RolesToUser")
            .select(`
        A,
        Roles!inner (
          id,
          name
        )
      `)
            .eq("B", userDbId);

        if (error) throw error;

        // Transform the data to include role details
        const assignedRoles = userRoles?.map((ur: any) => ({
            roleId: ur.A,
            roleName: ur.Roles.name,
        })) || [];

        return NextResponse.json({ assignedRoles });
    } catch (err: any) {
        console.error("Error fetching user assigned roles:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};
