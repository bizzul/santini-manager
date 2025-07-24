import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export type UserRole = "superadmin" | "admin" | "user";

export interface UserContext {
    user: any;
    role: UserRole;
    organizationId?: string;
    tenantId?: string;
    canAccessAllOrganizations: boolean;
    canAccessAllTenants: boolean;
    isImpersonating?: boolean;
    originalSuperadminId?: string;
    impersonatedUser?: any;
}

export interface OrganizationAccess {
    organizationId: string;
    role: UserRole;
    canManageUsers: boolean;
    canManageOrganization: boolean;
}

export interface TenantAccess {
    tenantId: string;
    organizationId: string;
    role: UserRole;
    canManageTenant: boolean;
}

/**
 * Get the current user's context including role and organization access
 */
export async function getUserContext(): Promise<UserContext | null> {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get("impersonation");
    let userIdToFetch: string | null = null;
    let originalSuperadminId: string | undefined = undefined;
    let isImpersonating = false;
    let impersonatedUser: any = undefined;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (impersonationCookie && user) {
        try {
            const { originalId, targetId } = JSON.parse(
                impersonationCookie.value,
            );
            userIdToFetch = targetId;
            originalSuperadminId = originalId;
            isImpersonating = true;
        } catch {}
    }
    if (!user && !userIdToFetch) {
        return null;
    }
    // If impersonating, fetch the impersonated user's info
    let userToUse = user;
    if (userIdToFetch) {
        const { data: impersonatedUserData, error: impErr } = await supabase
            .auth.admin.getUserById(userIdToFetch);
        if (impersonatedUserData && impersonatedUserData.user) {
            userToUse = impersonatedUserData.user;
            impersonatedUser = impersonatedUserData.user;
        } else {
            // If impersonation fails, fallback to real user
            userToUse = user;
            isImpersonating = false;
            originalSuperadminId = undefined;
        }
    }
    if (!userToUse) {
        return null;
    }
    // Get user's tenant information
    const { data: tenantData } = await supabase
        .from("tenants")
        .select("role, organization_id")
        .eq("user_id", userToUse.id)
        .single();
    if (!tenantData) {
        return null;
    }
    const role = tenantData.role as UserRole;
    const organizationId = tenantData.organization_id;
    const isSuperAdmin = role === "superadmin";
    const isAdmin = role === "admin";
    return {
        user: userToUse,
        role,
        organizationId,
        tenantId: userToUse.id,
        canAccessAllOrganizations: isSuperAdmin,
        canAccessAllTenants: isSuperAdmin || isAdmin,
        isImpersonating,
        originalSuperadminId,
        impersonatedUser,
    };
}

/**
 * Check if user has access to a specific organization
 */
export async function canAccessOrganization(
    organizationId: string,
): Promise<boolean> {
    const context = await getUserContext();
    if (!context) return false;

    // Superadmin can access all organizations
    if (context.canAccessAllOrganizations) return true;

    // Regular users can only access their own organization
    return context.organizationId === organizationId;
}

/**
 * Check if user has access to a specific tenant
 */
export async function canAccessTenant(
    tenantId: string,
    organizationId?: string,
): Promise<boolean> {
    const context = await getUserContext();
    if (!context) return false;

    // Superadmin can access all tenants
    if (context.canAccessAllOrganizations) return true;

    // Admin can access all tenants in their organization
    if (
        context.canAccessAllTenants && context.organizationId === organizationId
    ) return true;

    // Regular users can only access their own tenant
    return context.tenantId === tenantId;
}

/**
 * Get all organizations the user can access
 */
export async function getUserOrganizations(): Promise<string[]> {
    const context = await getUserContext();
    if (!context) return [];

    const supabase = await createClient();

    if (context.canAccessAllOrganizations) {
        // Superadmin can see all organizations
        const { data: organizations } = await supabase
            .from("organizations")
            .select("id");

        return organizations?.map((org) => org.id) || [];
    } else {
        // Regular users can only see their organization
        return context.organizationId ? [context.organizationId] : [];
    }
}

/**
 * Get all tenants the user can access
 */
export async function getUserTenants(
    organizationId?: string,
): Promise<string[]> {
    const context = await getUserContext();
    if (!context) return [];

    const supabase = await createClient();

    if (context.canAccessAllOrganizations) {
        // Superadmin can see all tenants
        const { data: tenants } = await supabase
            .from("tenants")
            .select("user_id")
            .eq(
                organizationId ? "organization_id" : "organization_id",
                organizationId || context.organizationId,
            );

        return tenants?.map((tenant) => tenant.user_id) || [];
    } else if (context.canAccessAllTenants) {
        // Admin can see all tenants in their organization
        const { data: tenants } = await supabase
            .from("tenants")
            .select("user_id")
            .eq("organization_id", context.organizationId);

        return tenants?.map((tenant) => tenant.user_id) || [];
    } else {
        // Regular users can only see themselves
        return context.tenantId ? [context.tenantId] : [];
    }
}

/**
 * Get all sites the user can access
 */
export async function getUserSites() {
    const context = await getUserContext();
    if (!context) return [];

    const supabase = await createClient();
    let sites: any[] = [];

    if (context.canAccessAllOrganizations) {
        // Superadmin: return all sites
        const { data, error } = await supabase
            .from("sites")
            .select("*, organization:organizations(*)");
        if (!error && data) sites = data;
    } else if (context.organizationId) {
        // Admin/User: return sites for their organization
        const { data, error } = await supabase
            .from("sites")
            .select("*, organization:organizations(*)")
            .eq("organization_id", context.organizationId);
        if (!error && data) sites = data;
    }

    // Also include sites where the user is directly assigned via site_users
    const { data: userSiteLinks, error: userSiteLinksError } = await supabase
        .from("site_users")
        .select("site_id")
        .eq("user_id", context.user.id);
    if (!userSiteLinksError && userSiteLinks && userSiteLinks.length > 0) {
        const siteIds = userSiteLinks.map((row: any) => row.site_id);
        if (siteIds.length > 0) {
            const { data: directSites, error: directSitesError } =
                await supabase
                    .from("sites")
                    .select("*, organization:organizations(*)")
                    .in("id", siteIds);
            if (!directSitesError && directSites) {
                // Merge and deduplicate
                const allSites = [...sites, ...directSites];
                const uniqueSites = allSites.filter((site, index, self) =>
                    index === self.findIndex((s) => s.id === site.id)
                );
                return uniqueSites;
            }
        }
    }
    return sites;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<UserContext> {
    const context = await getUserContext();
    if (!context) {
        redirect("/login");
    }
    return context;
}

/**
 * Require specific role - redirect to unauthorized if insufficient permissions
 */
export async function requireRole(
    requiredRole: UserRole,
): Promise<UserContext> {
    const context = await requireAuth();

    const roleHierarchy: Record<UserRole, number> = {
        "user": 1,
        "admin": 2,
        "superadmin": 3,
    };

    if (roleHierarchy[context.role] < roleHierarchy[requiredRole]) {
        redirect("/unauthorized");
    }

    return context;
}

/**
 * Require superadmin access
 */
export async function requireSuperAdmin(): Promise<UserContext> {
    return requireRole("superadmin");
}

/**
 * Require admin access (admin or superadmin)
 */
export async function requireAdmin(): Promise<UserContext> {
    return requireRole("admin");
}

/**
 * Create a database query filter based on user permissions
 */
export async function createAccessFilter(
    tableName: string,
    organizationColumn = "organization_id",
    tenantColumn = "user_id",
) {
    const context = await getUserContext();
    if (!context) return { error: "Not authenticated" };

    const supabase = await createClient();
    let query = supabase.from(tableName).select("*");

    if (context.canAccessAllOrganizations) {
        // Superadmin can see everything - no filter needed
        return { query };
    } else if (context.canAccessAllTenants && context.organizationId) {
        // Admin can see everything in their organization
        query = query.eq(organizationColumn, context.organizationId);
        return { query };
    } else {
        // Regular user can only see their own data
        query = query.eq(tenantColumn, context.tenantId);
        return { query };
    }
}

/**
 * Check if user can manage a specific organization
 */
export async function canManageOrganization(
    organizationId: string,
): Promise<boolean> {
    const context = await getUserContext();
    if (!context) return false;

    // Superadmin can manage all organizations
    if (context.role === "superadmin") return true;

    // Admin can manage their own organization
    if (context.role === "admin" && context.organizationId === organizationId) {
        return true;
    }

    return false;
}

/**
 * Check if user can manage a specific tenant
 */
export async function canManageTenant(
    tenantId: string,
    organizationId?: string,
): Promise<boolean> {
    const context = await getUserContext();
    if (!context) return false;

    // Superadmin can manage all tenants
    if (context.role === "superadmin") return true;

    // Admin can manage tenants in their organization
    if (context.role === "admin" && context.organizationId === organizationId) {
        return true;
    }

    // Users can manage themselves
    if (context.tenantId === tenantId) return true;

    return false;
}
