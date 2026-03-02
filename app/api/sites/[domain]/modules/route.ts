import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> },
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);

        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        const supabase = await createClient();
        const siteId = response.data.id;

        // Get user context for permission filtering
        const userContext = await getUserContext();
        const isAdmin = userContext && isAdminOrSuperadmin(userContext.role);

        // Get enabled modules for this site
        const { data: siteModules, error } = await supabase
            .from("site_modules")
            .select("module_name, is_enabled")
            .eq("site_id", siteId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Create a map of enabled modules
        const enabledModules = new Map(
            siteModules?.map((sm) => [sm.module_name, sm.is_enabled]) || [],
        );

        // Get user-specific module permissions (only for non-admin users)
        let userModulePermissions: Set<string> | null = null;
        if (!isAdmin && userContext?.userId) {
            const { data: userModules } = await supabase
                .from("user_module_permissions")
                .select("module_name")
                .eq("user_id", userContext.userId)
                .eq("site_id", siteId);

            userModulePermissions = new Set(
                userModules?.map((m) => m.module_name) || []
            );
        }

        // Return all available modules with their enabled status
        // For non-admin users, also check user permissions
        const modulesWithStatus = AVAILABLE_MODULES.map((module) => {
            const siteEnabled = enabledModules.get(module.name) ?? module.enabledByDefault;
            
            // Admin users: only check site-level enabling
            if (isAdmin) {
                return {
                    ...module,
                    isEnabled: siteEnabled,
                };
            }
            
            // Non-admin users: must have both site-level AND user-level permission
            // If user has no permissions at all, show nothing
            const userHasPermission = userModulePermissions?.has(module.name) ?? false;
            
            return {
                ...module,
                isEnabled: siteEnabled && userHasPermission,
            };
        });

        return NextResponse.json({ modules: modulesWithStatus });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> },
) {
    try {
        const { domain } = await params;
        const response = await getSiteData(domain);

        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, {
                status: 404,
            });
        }

        const supabase = await createClient();

        // Check if user is superadmin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, {
                status: 401,
            });
        }

        // Check if user has superadmin role from User table
        const { data: userProfile, error: userProfileError } = await supabase
            .from("User")
            .select("role")
            .eq("authId", user.id)
            .single();

        if (userProfileError || !userProfile) {
            return NextResponse.json({ error: "User profile not found" }, {
                status: 404,
            });
        }

        // Check if user has superadmin role
        if (userProfile.role !== "superadmin") {
            return NextResponse.json({
                error: "Only superadmins can modify modules",
            }, { status: 403 });
        }

        const body = await request.json();
        const { modules } = body;

        if (!modules || !Array.isArray(modules)) {
            return NextResponse.json({ error: "Invalid modules data" }, {
                status: 400,
            });
        }

        // Update modules for this site
        const updates = modules.map((module: any) => ({
            site_id: response.data.id,
            module_name: module.name,
            is_enabled: module.isEnabled,
        }));

        const { error } = await supabase
            .from("site_modules")
            .upsert(updates, { onConflict: "site_id,module_name" });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, {
            status: 500,
        });
    }
}
