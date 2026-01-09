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

        console.log("=== ASSIGNED ROLES DEBUG ===");
        console.log("Requested userId:", userId);
        console.log("userContext.role:", userContext.role);
        console.log("userContext.user?.id:", userContext.user?.id);

        // Admin and superadmin can view any user's roles
        const isAdmin = userContext.role === "admin" ||
            userContext.role === "superadmin";

        console.log("isAdmin:", isAdmin);

        // For non-admins, check if they're viewing their own profile
        if (!isAdmin) {
            // Get the current user's internal ID to compare
            const { data: currentUserData } = await supabase
                .from("User")
                .select("id")
                .eq("authId", userContext.user?.id)
                .single();

            console.log("currentUserData:", currentUserData);
            const isOwnProfile = currentUserData?.id?.toString() === userId;
            console.log("isOwnProfile:", isOwnProfile);

            if (!isOwnProfile) {
                console.log("FORBIDDEN - not own profile and not admin");
                return NextResponse.json({ error: "Forbidden" }, {
                    status: 403,
                });
            }
        }

        // userId parameter is the internal User.id
        const userDbId = parseInt(userId);
        console.log("Fetching roles for userDbId:", userDbId);

        if (isNaN(userDbId)) {
            return NextResponse.json({ error: "Invalid user ID" }, {
                status: 400,
            });
        }

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

        console.log("User roles query result:", userRoles, "Error:", error);

        if (error) throw error;

        // Transform the data to include role details
        const assignedRoles = userRoles?.map((ur: any) => ({
            roleId: ur.A,
            roleName: ur.Roles.name,
        })) || [];

        console.log("Assigned roles:", assignedRoles);

        return NextResponse.json({ assignedRoles });
    } catch (err: any) {
        console.error("Error fetching user assigned roles:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
};
