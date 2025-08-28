import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export type UserRole = "superadmin" | "admin" | "user";

export interface UserContext {
    user: any;
    role: UserRole;
    organizationId?: string; // Keep for backward compatibility
    organizationIds?: string[]; // New: array of organization IDs for many-to-many
    userId?: string; // New: user ID for easier access
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
 * Updated to work with new structure: User.role + user_organizations table
 */
export async function getUserContext(): Promise<UserContext | null> {
    try {
        const cookieStore = await cookies();
        const impersonationCookie = cookieStore.get("impersonation");
        let userIdToFetch: string | null = null;
        let originalSuperadminId: string | undefined = undefined;
        let isImpersonating = false;
        let impersonatedUser: any = undefined;

        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.error("Error getting user from auth:", error);
            return null;
        }

        if (impersonationCookie && user) {
            try {
                const { originalId, targetId } = JSON.parse(
                    impersonationCookie.value,
                );
                userIdToFetch = targetId;
                originalSuperadminId = originalId;
                isImpersonating = true;
            } catch (parseError) {
                console.error(
                    "Error parsing impersonation cookie:",
                    parseError,
                );
            }
        }

        if (!user && !userIdToFetch) {
            console.log("No user found and no impersonation target");
            return null;
        }

        // If impersonating, fetch the impersonated user's info
        let userToUse = user;
        if (userIdToFetch) {
            try {
                const { data: impersonatedUserData, error: impErr } =
                    await supabase
                        .auth.admin.getUserById(userIdToFetch);
                if (impErr) {
                    console.error("Error getting impersonated user:", impErr);
                }
                if (impersonatedUserData && impersonatedUserData.user) {
                    userToUse = impersonatedUserData.user;
                    impersonatedUser = impersonatedUserData.user;
                } else {
                    // If impersonation fails, fallback to real user
                    userToUse = user;
                    isImpersonating = false;
                    originalSuperadminId = undefined;
                }
            } catch (impError) {
                console.error("Error in impersonation flow:", impError);
                // Fallback to real user
                userToUse = user;
                isImpersonating = false;
                originalSuperadminId = undefined;
            }
        }

        if (!userToUse) {
            console.log("No user to use after impersonation check");
            return null;
        }

        console.log(
            "Fetching user data and organization relationships for user:",
            userToUse.id,
        );

        // Get user's role from User table
        const { data: userData, error: userError } = await supabase
            .from("User")
            .select("role")
            .eq("authId", userToUse.id);

        if (userError) {
            console.error("Error fetching user data:", userError);
            // Check if it's a "no rows returned" error
            if (userError.code === "PGRST116") {
                console.log("No user record found for user:", userToUse.id);
                // Return a default context for users without user records
                return {
                    user: userToUse,
                    role: "user" as UserRole,
                    organizationId: undefined,
                    organizationIds: [],
                    userId: userToUse.id,
                    tenantId: userToUse.id,
                    canAccessAllOrganizations: false,
                    canAccessAllTenants: false,
                    isImpersonating,
                    originalSuperadminId,
                    impersonatedUser,
                };
            }
            throw userError;
        }

        if (!userData || userData.length === 0) {
            console.log("No user data returned for user:", userToUse.id);
            return null;
        }

        // Get user's role from User table
        const role = userData[0]?.role as UserRole || "user";

        // Get user's organization relationships from user_organizations table
        const { data: userOrgData, error: userOrgError } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userToUse.id);

        console.log("User organization data:", userOrgData, userOrgError);
        if (userOrgError) {
            console.error(
                "Error fetching user organization data:",
                userOrgError,
            );
            // Return context with just the role if organization fetch fails
            return {
                user: userToUse,
                role: role,
                organizationId: undefined,
                organizationIds: [],
                userId: userToUse.id,
                tenantId: userToUse.id,
                canAccessAllOrganizations: role === "superadmin",
                canAccessAllTenants: role === "superadmin" || role === "admin",
                isImpersonating,
                originalSuperadminId,
                impersonatedUser,
            };
        }

        // Get all organization IDs from user_organizations table
        const organizationIds = userOrgData?.map((uo: any) =>
            uo.organization_id
        ) || [];
        const organizationId = organizationIds[0]; // Keep first one for backward compatibility

        const isSuperAdmin = role === "superadmin";
        const isAdmin = role === "admin";

        // console.log("User context created successfully:", {
        //     userId: userToUse.id,
        //     role,
        //     organizationIds,
        //     organizationId,
        //     isSuperAdmin,
        //     isAdmin,
        // });

        return {
            user: userToUse,
            role,
            organizationId,
            organizationIds,
            userId: userToUse.id,
            tenantId: userToUse.id,
            canAccessAllOrganizations: isSuperAdmin,
            canAccessAllTenants: isSuperAdmin || isAdmin,
            isImpersonating,
            originalSuperadminId,
            impersonatedUser,
        };
    } catch (error) {
        console.error("Error in getUserContext:", error);
        // Return null instead of throwing to prevent 500 errors
        return null;
    }
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

    // Regular users can only access organizations they belong to
    return context.organizationIds?.includes(organizationId) || false;
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

    // Superadmin can access all users
    if (context.canAccessAllOrganizations) return true;

    // Admin can access all users in their organizations
    if (
        context.canAccessAllTenants && context.organizationIds &&
        organizationId && context.organizationIds.includes(organizationId)
    ) return true;

    // Regular users can only access their own data
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
        // Regular users can see all organizations they belong to
        return context.organizationIds || [];
    }
}

/**
 * Get all users the user can access in organizations
 * Updated from getUserTenants to work with user_organizations table
 */
export async function getUsersInOrganizations(
    organizationId?: string,
): Promise<string[]> {
    const context = await getUserContext();
    if (!context) return [];

    const supabase = await createClient();

    if (context.canAccessAllOrganizations) {
        // Superadmin can see all users
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("user_id")
            .eq(
                "organization_id",
                organizationId ||
                    (context.organizationIds &&
                            context.organizationIds.length > 0
                        ? context.organizationIds[0]
                        : undefined),
            );

        return userOrgs?.map((userOrg) => userOrg.user_id) || [];
    } else if (context.canAccessAllTenants) {
        // Admin can see all users in their organizations
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("user_id")
            .in("organization_id", context.organizationIds || []);

        return userOrgs?.map((userOrg) => userOrg.user_id) || [];
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
    } else if (context.organizationIds && context.organizationIds.length > 0) {
        // Admin/User: return sites for all their organizations
        const { data, error } = await supabase
            .from("sites")
            .select("*, organization:organizations(*)")
            .in("organization_id", context.organizationIds);
        if (!error && data) sites = data;
    }

    // Also include sites where the user is directly assigned via user_sites
    const { data: userSiteLinks, error: userSiteLinksError } = await supabase
        .from("user_sites")
        .select("site_id")
        .eq("user_id", context.userId || context.user.id);
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
    } else if (
        context.canAccessAllTenants && context.organizationIds &&
        context.organizationIds.length > 0
    ) {
        // Admin can see everything in their organizations
        query = query.in(organizationColumn, context.organizationIds);
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

    // Admin can manage their own organizations
    if (
        context.role === "admin" && context.organizationIds &&
        context.organizationIds.includes(organizationId)
    ) {
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

    // Superadmin can manage all users
    if (context.role === "superadmin") return true;

    // Admin can manage users in their organizations
    if (
        context.role === "admin" && context.organizationIds && organizationId &&
        context.organizationIds.includes(organizationId)
    ) {
        return true;
    }

    // Users can manage themselves
    if (context.tenantId === tenantId) return true;

    return false;
}
