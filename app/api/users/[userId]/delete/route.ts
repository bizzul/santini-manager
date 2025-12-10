import { createClient, createServiceClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> },
) {
    try {
        const { userId } = await params;

        const supabase = await createClient();
        const supabaseService = await createServiceClient();

        logger.debug("Service clients created successfully");

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
            logger.error("User lookup error:", userError);
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
        logger.debug("Attempting to delete user from Auth:", userId);

        const { error: deleteAuthError } = await supabaseService.auth.admin
            .deleteUser(
                userId,
            );

        if (deleteAuthError) {
            logger.error("Error deleting user from Auth:", deleteAuthError);
            logger.error("Error details:", {
                message: deleteAuthError.message,
                status: deleteAuthError.status,
                name: deleteAuthError.name,
                details: deleteAuthError,
            });
            return NextResponse.json({
                error: "Failed to delete user",
            }, { status: 500 });
        }

        logger.debug("User successfully deleted from Auth:", userId);

        // Manually delete user profile and relationships since the trigger isn't working
        logger.debug("Manually cleaning up user data...");

        try {
            // First, get the User table ID for this auth user
            const { data: userRecord, error: userLookupError } = await supabase
                .from("User")
                .select("id")
                .eq("authId", userId)
                .single();

            if (userLookupError || !userRecord) {
                console.error("Error finding user record:", userLookupError);
                return NextResponse.json({
                    error: "User record not found in database",
                }, { status: 404 });
            }

            const userTableId = userRecord.id;
            logger.debug("Found user table ID:", userTableId);

            // Delete from tables that reference User.id (in dependency order)
            const tablesToClean = [
                // Junction tables first
                "_RolesToUser",
                "user_organizations",
                "user_sites",
                // Then tables with user references
                "Action",
                "Errortracking",
                "PackingControl",
                "QualityControl",
                "Task",
                "Timetracking",
            ];

            for (const tableName of tablesToClean) {
                try {
                    // Handle different column names for user references
                    let deleteQuery = supabase.from(tableName).delete();

                    if (tableName === "_RolesToUser") {
                        deleteQuery = deleteQuery.eq("B", userTableId);
                    } else if (
                        tableName === "user_organizations" ||
                        tableName === "user_sites"
                    ) {
                        deleteQuery = deleteQuery.eq("user_id", userId);
                    } else if (tableName === "Action") {
                        deleteQuery = deleteQuery.eq("userId", userTableId);
                    } else if (
                        tableName === "Errortracking" ||
                        tableName === "Timetracking"
                    ) {
                        deleteQuery = deleteQuery.eq(
                            "employee_id",
                            userTableId,
                        );
                    } else if (
                        tableName === "PackingControl" ||
                        tableName === "QualityControl" || tableName === "Task"
                    ) {
                        deleteQuery = deleteQuery.eq("userId", userTableId);
                    }

                    const { error: deleteError } = await deleteQuery;

                    if (deleteError) {
                        logger.warn(
                            `Error deleting from ${tableName}:`,
                            deleteError,
                        );
                    } else {
                        logger.debug(`Successfully cleaned up ${tableName}`);
                    }
                } catch (tableError) {
                    logger.warn(
                        `Error processing table ${tableName}:`,
                        tableError,
                    );
                }
            }

            // Finally, delete user profile from User table
            const { error: profileDeleteError } = await supabase
                .from("User")
                .delete()
                .eq("authId", userId);

            if (profileDeleteError) {
                logger.error(
                    "Error deleting user profile:",
                    profileDeleteError,
                );
                return NextResponse.json({
                    error:
                        "User deleted from Auth but failed to clean up profile data",
                }, { status: 500 });
            } else {
                logger.debug("User profile deleted from User table");
            }
        } catch (cleanupError) {
            logger.error("Error during cleanup:", cleanupError);
            return NextResponse.json({
                error: "User deleted from Auth but failed to clean up data",
            }, { status: 500 });
        }

        logger.info(
            `User deleted successfully: ${userData.email} (${userData.given_name} ${userData.family_name})`,
        );

        return NextResponse.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        logger.error("Error deleting user:", error);
        return NextResponse.json({
            error: `Failed to delete user: ${
                error instanceof Error ? error.message : "Unknown error"
            }`,
        }, { status: 500 });
    }
}
