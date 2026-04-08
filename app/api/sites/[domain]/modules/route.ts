import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { AVAILABLE_MODULES } from "@/lib/module-config";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

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

        const [userContext, siteModulesResult] = await Promise.all([
            getUserContext(),
            supabase
                .from("site_modules")
                .select("module_name, is_enabled")
                .eq("site_id", siteId),
        ]);
        const isAdmin = userContext && isAdminOrSuperadmin(userContext.role);
        const { data: siteModules, error } = siteModulesResult;

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

        // Return all available modules with their enabled status.
        // If a non-admin user has explicit module permissions, intersect them with
        // the site-level modules. If no explicit rows exist yet, fall back to the
        // site-level configuration so newly enabled modules are visible immediately.
        const modulesWithStatus = AVAILABLE_MODULES.map((module) => {
            const siteEnabled = enabledModules.get(module.name) ?? module.enabledByDefault;
            
            // Admin users: only check site-level enabling
            if (isAdmin) {
                return {
                    ...module,
                    isEnabled: siteEnabled,
                };
            }
            
            // Non-admin users with no explicit module rows inherit the site-level setup.
            if (!userModulePermissions || userModulePermissions.size === 0) {
                return {
                    ...module,
                    isEnabled: siteEnabled,
                };
            }

            // Non-admin users with explicit rows must satisfy both site-level and
            // user-level permission checks.
            const userHasPermission = userModulePermissions?.has(module.name) ?? false;
            
            return {
                ...module,
                isEnabled: siteEnabled && userHasPermission,
            };
        });

        return NextResponse.json(
            { modules: modulesWithStatus },
            {
                headers: {
                    // User-aware endpoint: keep cache private and short-lived.
                    "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
                },
            },
        );
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
