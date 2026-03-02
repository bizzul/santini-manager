import { createClient } from "@/utils/supabase/server";
import { getUserContext, UserRole } from "@/lib/auth-utils";
import { cache } from "react";
import type {
    UserModulePermission,
    UserKanbanPermission,
    UserKanbanCategoryPermission,
    UserPermissions,
} from "@/types/supabase";

/**
 * Check if user role is admin or superadmin (bypasses permission checks)
 */
export function isAdminOrSuperadmin(role: UserRole): boolean {
    return role === "admin" || role === "superadmin";
}

/**
 * Get all permissions for a user on a specific site
 * Cached per request to avoid duplicate queries
 */
export const getUserPermissions = cache(
    async (userId: string, siteId: string): Promise<UserPermissions | null> => {
        const supabase = await createClient();

        const [modulesResult, kanbansResult, categoriesResult] = await Promise.all([
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
        ]);

        if (modulesResult.error || kanbansResult.error || categoriesResult.error) {
            console.error("Error fetching user permissions:", {
                modules: modulesResult.error,
                kanbans: kanbansResult.error,
                categories: categoriesResult.error,
            });
            return null;
        }

        return {
            modules: modulesResult.data?.map((p) => p.module_name) || [],
            kanbans: kanbansResult.data?.map((p) => p.kanban_id) || [],
            kanban_categories: categoriesResult.data?.map((p) => p.kanban_category_id) || [],
        };
    }
);

/**
 * Check if user can access a specific module
 * Admin/superadmin always have access
 */
export async function canAccessModule(
    userId: string,
    siteId: string,
    moduleName: string,
    userRole?: UserRole
): Promise<boolean> {
    // If role provided and is admin/superadmin, bypass check
    if (userRole && isAdminOrSuperadmin(userRole)) {
        return true;
    }

    // If no role provided, get context to check
    if (!userRole) {
        const context = await getUserContext();
        if (context && isAdminOrSuperadmin(context.role)) {
            return true;
        }
    }

    const permissions = await getUserPermissions(userId, siteId);
    if (!permissions) return false;

    return permissions.modules.includes(moduleName);
}

/**
 * Check if user can access a specific kanban
 * Returns true if user has direct permission OR permission on the kanban's category
 * Admin/superadmin always have access
 */
export async function canAccessKanban(
    userId: string,
    kanbanId: number,
    kanbanCategoryId: number | null | undefined,
    userRole?: UserRole
): Promise<boolean> {
    // If role provided and is admin/superadmin, bypass check
    if (userRole && isAdminOrSuperadmin(userRole)) {
        return true;
    }

    // If no role provided, get context to check
    if (!userRole) {
        const context = await getUserContext();
        if (context && isAdminOrSuperadmin(context.role)) {
            return true;
        }
    }

    const supabase = await createClient();

    // Check direct kanban permission
    const { data: kanbanPerm } = await supabase
        .from("user_kanban_permissions")
        .select("id")
        .eq("user_id", userId)
        .eq("kanban_id", kanbanId)
        .maybeSingle();

    if (kanbanPerm) return true;

    // Check category permission if kanban has a category
    if (kanbanCategoryId) {
        const { data: categoryPerm } = await supabase
            .from("user_kanban_category_permissions")
            .select("id")
            .eq("user_id", userId)
            .eq("kanban_category_id", kanbanCategoryId)
            .maybeSingle();

        if (categoryPerm) return true;
    }

    return false;
}

/**
 * Get list of accessible module names for a user on a site
 * Admin/superadmin get all modules
 */
export async function getUserModules(
    userId: string,
    siteId: string,
    userRole?: UserRole
): Promise<string[] | "all"> {
    // Admin/superadmin see all modules
    if (userRole && isAdminOrSuperadmin(userRole)) {
        return "all";
    }

    if (!userRole) {
        const context = await getUserContext();
        if (context && isAdminOrSuperadmin(context.role)) {
            return "all";
        }
    }

    const permissions = await getUserPermissions(userId, siteId);
    return permissions?.modules || [];
}

/**
 * Get list of accessible kanban IDs for a user
 * Admin/superadmin get all kanbans
 */
export async function getUserKanbans(
    userId: string,
    siteId: string,
    userRole?: UserRole
): Promise<number[] | "all"> {
    // Admin/superadmin see all kanbans
    if (userRole && isAdminOrSuperadmin(userRole)) {
        return "all";
    }

    if (!userRole) {
        const context = await getUserContext();
        if (context && isAdminOrSuperadmin(context.role)) {
            return "all";
        }
    }

    const supabase = await createClient();

    // Get direct kanban permissions
    const { data: directPerms } = await supabase
        .from("user_kanban_permissions")
        .select("kanban_id")
        .eq("user_id", userId);

    const directIds = directPerms?.map((p) => p.kanban_id) || [];

    // Get category permissions and find kanbans in those categories
    const { data: categoryPerms } = await supabase
        .from("user_kanban_category_permissions")
        .select("kanban_category_id")
        .eq("user_id", userId);

    if (categoryPerms && categoryPerms.length > 0) {
        const categoryIds = categoryPerms.map((p) => p.kanban_category_id);
        const { data: kanbansInCategories } = await supabase
            .from("Kanban")
            .select("id")
            .eq("site_id", siteId)
            .in("category_id", categoryIds);

        const categoryKanbanIds = kanbansInCategories?.map((k) => k.id) || [];
        
        // Merge and deduplicate
        const allIds = Array.from(new Set([...directIds, ...categoryKanbanIds]));
        return allIds;
    }

    return directIds;
}

/**
 * Get list of accessible kanban category IDs for a user
 */
export async function getUserKanbanCategories(
    userId: string,
    userRole?: UserRole
): Promise<number[] | "all"> {
    if (userRole && isAdminOrSuperadmin(userRole)) {
        return "all";
    }

    if (!userRole) {
        const context = await getUserContext();
        if (context && isAdminOrSuperadmin(context.role)) {
            return "all";
        }
    }

    const supabase = await createClient();
    const { data } = await supabase
        .from("user_kanban_category_permissions")
        .select("kanban_category_id")
        .eq("user_id", userId);

    return data?.map((p) => p.kanban_category_id) || [];
}

// ==========================================
// PERMISSION MANAGEMENT FUNCTIONS (for admins)
// ==========================================

/**
 * Set module permissions for a user (replaces existing)
 */
export async function setUserModulePermissions(
    targetUserId: string,
    siteId: string,
    moduleNames: string[]
): Promise<{ success: boolean; error?: string }> {
    const context = await getUserContext();
    if (!context || !isAdminOrSuperadmin(context.role)) {
        return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();

    // Delete existing permissions for this user/site
    const { error: deleteError } = await supabase
        .from("user_module_permissions")
        .delete()
        .eq("user_id", targetUserId)
        .eq("site_id", siteId);

    if (deleteError) {
        console.error("Error deleting module permissions:", deleteError);
        return { success: false, error: deleteError.message };
    }

    // Insert new permissions
    if (moduleNames.length > 0) {
        const permissions = moduleNames.map((module_name) => ({
            user_id: targetUserId,
            site_id: siteId,
            module_name,
        }));

        const { error: insertError } = await supabase
            .from("user_module_permissions")
            .insert(permissions);

        if (insertError) {
            console.error("Error inserting module permissions:", insertError);
            return { success: false, error: insertError.message };
        }
    }

    return { success: true };
}

/**
 * Set kanban permissions for a user (replaces existing)
 */
export async function setUserKanbanPermissions(
    targetUserId: string,
    kanbanIds: number[]
): Promise<{ success: boolean; error?: string }> {
    const context = await getUserContext();
    if (!context || !isAdminOrSuperadmin(context.role)) {
        return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();

    // Delete existing permissions for this user
    const { error: deleteError } = await supabase
        .from("user_kanban_permissions")
        .delete()
        .eq("user_id", targetUserId);

    if (deleteError) {
        console.error("Error deleting kanban permissions:", deleteError);
        return { success: false, error: deleteError.message };
    }

    // Insert new permissions
    if (kanbanIds.length > 0) {
        const permissions = kanbanIds.map((kanban_id) => ({
            user_id: targetUserId,
            kanban_id,
        }));

        const { error: insertError } = await supabase
            .from("user_kanban_permissions")
            .insert(permissions);

        if (insertError) {
            console.error("Error inserting kanban permissions:", insertError);
            return { success: false, error: insertError.message };
        }
    }

    return { success: true };
}

/**
 * Set kanban category permissions for a user (replaces existing)
 */
export async function setUserKanbanCategoryPermissions(
    targetUserId: string,
    categoryIds: number[]
): Promise<{ success: boolean; error?: string }> {
    const context = await getUserContext();
    if (!context || !isAdminOrSuperadmin(context.role)) {
        return { success: false, error: "Unauthorized" };
    }

    const supabase = await createClient();

    // Delete existing permissions for this user
    const { error: deleteError } = await supabase
        .from("user_kanban_category_permissions")
        .delete()
        .eq("user_id", targetUserId);

    if (deleteError) {
        console.error("Error deleting kanban category permissions:", deleteError);
        return { success: false, error: deleteError.message };
    }

    // Insert new permissions
    if (categoryIds.length > 0) {
        const permissions = categoryIds.map((kanban_category_id) => ({
            user_id: targetUserId,
            kanban_category_id,
        }));

        const { error: insertError } = await supabase
            .from("user_kanban_category_permissions")
            .insert(permissions);

        if (insertError) {
            console.error("Error inserting kanban category permissions:", insertError);
            return { success: false, error: insertError.message };
        }
    }

    return { success: true };
}

/**
 * Set all permissions for a user at once
 */
export async function setUserPermissions(
    targetUserId: string,
    siteId: string,
    permissions: UserPermissions
): Promise<{ success: boolean; error?: string }> {
    const context = await getUserContext();
    if (!context || !isAdminOrSuperadmin(context.role)) {
        return { success: false, error: "Unauthorized" };
    }

    // Set all permissions in parallel
    const [modulesResult, kanbansResult, categoriesResult] = await Promise.all([
        setUserModulePermissions(targetUserId, siteId, permissions.modules),
        setUserKanbanPermissions(targetUserId, permissions.kanbans),
        setUserKanbanCategoryPermissions(targetUserId, permissions.kanban_categories),
    ]);

    if (!modulesResult.success) {
        return { success: false, error: modulesResult.error };
    }
    if (!kanbansResult.success) {
        return { success: false, error: kanbansResult.error };
    }
    if (!categoriesResult.success) {
        return { success: false, error: categoriesResult.error };
    }

    return { success: true };
}

/**
 * Get all permissions for a specific user (for admin UI)
 */
export async function getPermissionsForUser(
    targetUserId: string,
    siteId: string
): Promise<UserPermissions | null> {
    const context = await getUserContext();
    if (!context || !isAdminOrSuperadmin(context.role)) {
        return null;
    }

    const supabase = await createClient();

    const [modulesResult, kanbansResult, categoriesResult] = await Promise.all([
        supabase
            .from("user_module_permissions")
            .select("module_name")
            .eq("user_id", targetUserId)
            .eq("site_id", siteId),
        supabase
            .from("user_kanban_permissions")
            .select("kanban_id")
            .eq("user_id", targetUserId),
        supabase
            .from("user_kanban_category_permissions")
            .select("kanban_category_id")
            .eq("user_id", targetUserId),
    ]);

    return {
        modules: modulesResult.data?.map((p) => p.module_name) || [],
        kanbans: kanbansResult.data?.map((p) => p.kanban_id) || [],
        kanban_categories: categoriesResult.data?.map((p) => p.kanban_category_id) || [],
    };
}
