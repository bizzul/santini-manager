import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { getUserContext } from "@/lib/auth-utils";
import { isAdminOrSuperadmin } from "@/lib/permissions";
import type { UserPermissions } from "@/types/supabase";

type AssistanceLevel = "basic_tutorial" | "smart_support" | "advanced_support";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; userId: string }> }
) {
    try {
        const { domain, userId } = await params;
        
        // Check if user is authenticated and is admin/superadmin
        const context = await getUserContext();
        if (!context) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdminOrSuperadmin(context.role)) {
            return NextResponse.json(
                { error: "Only admins can view user permissions" },
                { status: 403 }
            );
        }

        // Get site data
        const response = await getSiteData(domain);
        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const siteId = response.data.id;
        const supabase = await createClient();

        // Fetch all permissions and assistance level for this user.
        const [modulesResult, kanbansResult, categoriesResult, userResult] = await Promise.all([
            supabase
                .from("user_module_permissions")
                .select("module_name")
                .eq("user_id", userId)
                .eq("site_id", siteId),
            supabase
                .from("user_kanban_permissions")
                .select("kanban_id")
                .eq("user_id", userId),
            supabase
                .from("user_kanban_category_permissions")
                .select("kanban_category_id")
                .eq("user_id", userId),
            supabase
                .from("User")
                .select("assistance_level")
                .eq("authId", userId)
                .maybeSingle(),
        ]);

        if (modulesResult.error) {
            console.error("Error fetching module permissions:", modulesResult.error);
            return NextResponse.json(
                { error: modulesResult.error.message },
                { status: 500 }
            );
        }

        const permissions: UserPermissions = {
            modules: modulesResult.data?.map((p) => p.module_name) || [],
            kanbans: kanbansResult.data?.map((p) => p.kanban_id) || [],
            kanban_categories: categoriesResult.data?.map((p) => p.kanban_category_id) || [],
        };

        return NextResponse.json({
            permissions,
            assistance_level: (userResult.data?.assistance_level || "basic_tutorial") as AssistanceLevel,
        });
    } catch (error) {
        console.error("Error in GET permissions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string; userId: string }> }
) {
    try {
        const { domain, userId } = await params;

        // Check if user is authenticated and is admin/superadmin
        const context = await getUserContext();
        if (!context) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdminOrSuperadmin(context.role)) {
            return NextResponse.json(
                { error: "Only admins can modify user permissions" },
                { status: 403 }
            );
        }

        // Get site data
        const response = await getSiteData(domain);
        if (!response?.data) {
            return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }

        const siteId = response.data.id;
        const supabase = await createClient();

        // Parse request body
        const body = await request.json();
        const {
            modules,
            kanbans,
            kanban_categories,
            assistance_level,
        } = body as UserPermissions & { assistance_level?: AssistanceLevel };

        // Validate input
        if (!Array.isArray(modules) || !Array.isArray(kanbans) || !Array.isArray(kanban_categories)) {
            return NextResponse.json(
                { error: "Invalid permissions data. Expected arrays for modules, kanbans, and kanban_categories" },
                { status: 400 }
            );
        }

        if (
            assistance_level !== undefined &&
            !["basic_tutorial", "smart_support", "advanced_support"].includes(
                assistance_level
            )
        ) {
            return NextResponse.json(
                { error: "Invalid assistance_level value" },
                { status: 400 }
            );
        }

        // Delete existing permissions and insert new ones in a transaction-like manner
        // Since Supabase doesn't support true transactions via the client,
        // we'll do it in order: delete all, then insert all

        // 1. Delete existing module permissions
        const { error: deleteModulesError } = await supabase
            .from("user_module_permissions")
            .delete()
            .eq("user_id", userId)
            .eq("site_id", siteId);

        if (deleteModulesError) {
            console.error("Error deleting module permissions:", deleteModulesError);
            return NextResponse.json(
                { error: deleteModulesError.message },
                { status: 500 }
            );
        }

        // 2. Delete existing kanban permissions
        const { error: deleteKanbansError } = await supabase
            .from("user_kanban_permissions")
            .delete()
            .eq("user_id", userId);

        if (deleteKanbansError) {
            console.error("Error deleting kanban permissions:", deleteKanbansError);
            return NextResponse.json(
                { error: deleteKanbansError.message },
                { status: 500 }
            );
        }

        // 3. Delete existing category permissions
        const { error: deleteCategoriesError } = await supabase
            .from("user_kanban_category_permissions")
            .delete()
            .eq("user_id", userId);

        if (deleteCategoriesError) {
            console.error("Error deleting category permissions:", deleteCategoriesError);
            return NextResponse.json(
                { error: deleteCategoriesError.message },
                { status: 500 }
            );
        }

        // 4. Insert new module permissions
        if (modules.length > 0) {
            const modulePermissions = modules.map((module_name) => ({
                user_id: userId,
                site_id: siteId,
                module_name,
            }));

            const { error: insertModulesError } = await supabase
                .from("user_module_permissions")
                .insert(modulePermissions);

            if (insertModulesError) {
                console.error("Error inserting module permissions:", insertModulesError);
                return NextResponse.json(
                    { error: insertModulesError.message },
                    { status: 500 }
                );
            }
        }

        // 5. Insert new kanban permissions
        if (kanbans.length > 0) {
            const kanbanPermissions = kanbans.map((kanban_id) => ({
                user_id: userId,
                kanban_id,
            }));

            const { error: insertKanbansError } = await supabase
                .from("user_kanban_permissions")
                .insert(kanbanPermissions);

            if (insertKanbansError) {
                console.error("Error inserting kanban permissions:", insertKanbansError);
                return NextResponse.json(
                    { error: insertKanbansError.message },
                    { status: 500 }
                );
            }
        }

        // 6. Insert new category permissions
        if (kanban_categories.length > 0) {
            const categoryPermissions = kanban_categories.map((kanban_category_id) => ({
                user_id: userId,
                kanban_category_id,
            }));

            const { error: insertCategoriesError } = await supabase
                .from("user_kanban_category_permissions")
                .insert(categoryPermissions);

            if (insertCategoriesError) {
                console.error("Error inserting category permissions:", insertCategoriesError);
                return NextResponse.json(
                    { error: insertCategoriesError.message },
                    { status: 500 }
                );
            }
        }

        // 7. Update assistance level when provided (superadmin only)
        if (assistance_level !== undefined) {
            if (context.role !== "superadmin") {
                return NextResponse.json(
                    { error: "Only superadmin can modify assistance level" },
                    { status: 403 }
                );
            }

            const { error: updateUserError } = await supabase
                .from("User")
                .update({ assistance_level })
                .eq("authId", userId);

            if (updateUserError) {
                console.error("Error updating assistance level:", updateUserError);
                return NextResponse.json(
                    { error: updateUserError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in POST permissions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
