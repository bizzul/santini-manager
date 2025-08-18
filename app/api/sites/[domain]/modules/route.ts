import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { AVAILABLE_MODULES } from "@/lib/module-config";

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

        // Get enabled modules for this site
        const { data: siteModules, error } = await supabase
            .from("site_modules")
            .select("module_name, is_enabled")
            .eq("site_id", response.data.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Create a map of enabled modules
        const enabledModules = new Map(
            siteModules?.map((sm) => [sm.module_name, sm.is_enabled]) || [],
        );

        // Return all available modules with their enabled status
        const modulesWithStatus = AVAILABLE_MODULES.map((module) => ({
            ...module,
            isEnabled: enabledModules.get(module.name) ??
                module.enabledByDefault,
        }));

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

        // Check if user has superadmin role
        const { data: tenantData, error: tenantError } = await supabase
            .from("tenants")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (tenantError || !tenantData) {
            return NextResponse.json({ error: "User not found" }, {
                status: 404,
            });
        }

        // Check if user has superadmin role
        if (tenantData.role !== "superadmin") {
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
