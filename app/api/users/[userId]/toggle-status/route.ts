import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const { userId } = await params;
        const supabase = await createClient();

        // Get the current user from Supabase auth to verify permissions
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Check if user has admin privileges
        const userContext = await getUserContext();
        if (
            !userContext ||
            (userContext.role !== "admin" && userContext.role !== "superadmin")
        ) {
            return NextResponse.json({ error: "Insufficient permissions" }, {
                status: 403,
            });
        }

        const { enabled } = await req.json();

        if (typeof enabled !== "boolean") {
            return NextResponse.json({ error: "Invalid enabled value" }, {
                status: 400,
            });
        }

        // Check if user is trying to deactivate themselves
        if (userId === user.id && !enabled) {
            return NextResponse.json({
                error: "Cannot deactivate your own account",
            }, { status: 400 });
        }

        // Update the user's enabled status
        const { error } = await supabase
            .from("User")
            .update({ enabled })
            .eq("authId", userId);

        if (error) {
            return NextResponse.json({
                error: `Failed to update user status: ${error.message}`,
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `User status updated successfully`,
            enabled,
        });
    } catch (error) {
        console.error("Error toggling user status:", error);
        return NextResponse.json({
            error: `Failed to toggle user status: ${
                error instanceof Error ? error.message : "Unknown error"
            }`,
        }, { status: 500 });
    }
}
