import { createClient, createServiceClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const { userId } = await params;

        const supabase = await createClient();
        const supabaseService = await createServiceClient();

        console.log("Service clients created successfully");

        // Get the current user from Supabase auth to verify permissions
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        console.log("Current user authenticated:", user.id);
        console.log("Target user ID:", userId);

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

        // Prevent users from deleting themselves
        if (userId === user.id) {
            return NextResponse.json({
                error: "You cannot delete your own account",
            }, { status: 400 });
        }

        // Get user details for logging
        const { data: userData, error: userError } = await supabase
            .from("User")
            .select("email, given_name, family_name, role")
            .eq("authId", userId)
            .single();

        if (userError || !userData) {
            console.error("User lookup error:", userError);
            return NextResponse.json({
                error: "User not found",
            }, { status: 404 });
        }

        // Prevent deletion of superadmin users (unless current user is superadmin)
        if (
            userData.role === "superadmin" && userContext.role !== "superadmin"
        ) {
            return NextResponse.json({
                error: "Only superadmins can delete superadmin users",
            }, { status: 403 });
        }

        // Delete user from Supabase Auth
        console.log("Attempting to delete user from Auth:", userId);

        const { error: deleteAuthError } = await supabaseService.auth.admin
            .deleteUser(
                userId,
            );

        if (deleteAuthError) {
            console.error("Error deleting user from Auth:", deleteAuthError);
            console.error("Error details:", {
                message: deleteAuthError.message,
                status: deleteAuthError.status,
                name: deleteAuthError.name,
                details: deleteAuthError,
            });
            return NextResponse.json({
                error: "Failed to delete user",
            }, { status: 500 });
        }

        console.log("User successfully deleted from Auth:", userId);

        // Manually delete user profile and relationships since the trigger isn't working
        console.log("Manually cleaning up user data...");

        try {
            // Delete user-organization relationships
            const { error: orgDeleteError } = await supabase
                .from("user_organizations")
                .delete()
                .eq("user_id", userId);

            if (orgDeleteError) {
                console.warn(
                    "Error deleting user-organization relationships:",
                    orgDeleteError,
                );
            } else {
                console.log("User-organization relationships deleted");
            }

            // Delete user-site relationships
            const { error: siteDeleteError } = await supabase
                .from("user_sites")
                .delete()
                .eq("user_id", userId);

            if (siteDeleteError) {
                console.warn(
                    "Error deleting user-site relationships:",
                    siteDeleteError,
                );
            } else {
                console.log("User-site relationships deleted");
            }

            // Delete user profile from User table
            const { error: profileDeleteError } = await supabase
                .from("User")
                .delete()
                .eq("authId", userId);

            if (profileDeleteError) {
                console.error(
                    "Error deleting user profile:",
                    profileDeleteError,
                );
                return NextResponse.json({
                    error:
                        "User deleted from Auth but failed to clean up profile data",
                }, { status: 500 });
            } else {
                console.log("User profile deleted from User table");
            }
        } catch (cleanupError) {
            console.error("Error during cleanup:", cleanupError);
            return NextResponse.json({
                error: "User deleted from Auth but failed to clean up data",
            }, { status: 500 });
        }

        console.log(
            `User deleted successfully: ${userData.email} (${userData.given_name} ${userData.family_name})`,
        );

        return NextResponse.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({
            error: `Failed to delete user: ${
                error instanceof Error ? error.message : "Unknown error"
            }`,
        }, { status: 500 });
    }
}
