"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Wrapper for deleteSite from parent actions (re-exports not allowed in "use server" files)
export async function deleteSite(siteId: string) {
    const { deleteSite: parentDeleteSite } = await import("../actions");
    return parentDeleteSite(siteId);
}

export async function createSiteWithAssociations(
    prevState: any,
    formData: FormData,
) {
    const supabase = await createClient();

    // Check if user is superadmin or admin
    const { getUserContext } = await import("@/lib/auth-utils");
    const userContext = await getUserContext();
    if (!userContext) {
        return {
            success: false,
            message: "Authentication required",
        };
    }

    // Only allow admin and superadmin users to create sites
    if (userContext.role !== "admin" && userContext.role !== "superadmin") {
        return {
            success: false,
            message:
                "Unauthorized: Only admin and superadmin users can create sites",
        };
    }

    const name = formData.get("name") as string;
    const subdomain = formData.get("subdomain") as string;
    const description = formData.get("description") as string;
    const organizationId = formData.get("organization_id") as string; // Updated field name
    const users = formData.get("users") as string; // Get as string and split

    if (!name || !subdomain || !organizationId) {
        return {
            success: false,
            message: "Name, subdomain, and organization are required.",
        };
    }

    // For admin users, verify they can only create sites in their own organization
    if (userContext.role === "admin") {
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext.userId);

        if (!userOrgs || userOrgs.length === 0) {
            return {
                success: false,
                message: "You are not associated with any organization",
            };
        }

        const userOrgIds = userOrgs.map((uo: any) => uo.organization_id);
        if (!userOrgIds.includes(organizationId)) {
            return {
                success: false,
                message:
                    "Unauthorized: You can only create sites in your own organization",
            };
        }
    }

    // 1. Create the site (with organization_id)
    const { data: site, error: siteError } = await supabase
        .from("sites")
        .insert({
            name,
            subdomain,
            description,
            organization_id: organizationId,
        })
        .select()
        .single();
    if (siteError || !site) {
        return {
            success: false,
            message: "Failed to create site: " +
                (siteError?.message || "Unknown error"),
        };
    }

    // 2. Associate users (user_sites join table)
    if (users && users.trim()) {
        const userIds = users.split(",").filter((id) => id.trim());
        if (userIds.length > 0) {
            const userRows = userIds.map((userId) => ({
                site_id: site.id,
                user_id: userId.trim(),
            }));
            const { error: userError } = await supabase.from("user_sites")
                .insert(
                    userRows,
                );
            if (userError) {
                return {
                    success: false,
                    message: "Failed to add users: " + userError.message,
                };
            }
        }
    }

    revalidatePath("/administration/sites");
    return {
        success: true,
        message: "Site created and associated successfully!",
    };
}

export async function getSiteById(id: string) {
    const supabase = await createClient();

    // First get the site
    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("*")
        .eq("id", id)
        .single();

    if (siteError || !site) return null;

    // Then get the organization details
    if (site.organization_id) {
        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", site.organization_id)
            .single();

        if (!orgError && organization) {
            site.organization = organization;
        }
    }

    return site;
}

export async function getSiteUsers(siteId: string) {
    const supabase = await createClient();

    // First get the site to find its organization
    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("organization_id")
        .eq("id", siteId)
        .single();

    if (siteError || !site) {
        console.error("Error fetching site:", siteError);
        return [];
    }

    // Get user_sites to find which users have access to this site
    const { data: siteUsersData, error: siteUsersError } = await supabase
        .from("user_sites")
        .select("user_id")
        .eq("site_id", siteId);

    if (siteUsersError) {
        console.error("Error fetching site users:", siteUsersError);
        return [];
    }

    if (!siteUsersData || siteUsersData.length === 0) {
        return [];
    }

    // Get user IDs from user_sites
    const userIds = siteUsersData.map((row: any) => row.user_id);

    // Get user roles from user_organizations table (organization-level roles)
    const { data: userOrgData, error: userOrgError } = await supabase
        .from("user_organizations")
        .select("user_id, organization_id")
        .in("user_id", userIds);

    if (userOrgError) {
        console.error("Error fetching user organization data:", userOrgError);
        return [];
    }

    // Get user roles from User table (since roles are now stored there)
    const { data: userRolesData, error: userRolesError } = await supabase
        .from("User")
        .select("authId, role")
        .in("authId", userIds);

    if (userRolesError) {
        console.error("Error fetching user roles:", userRolesError);
        return [];
    }

    // Get user details from User table
    let userData: any[] = [];

    if (userIds.length > 0) {
        const { data: users, error: userError } = await supabase
            .from("User")
            .select("*")
            .in("authId", userIds);

        if (!userError && users) {
            userData = users;
        }
    }

    // Return the combined data
    const result = siteUsersData.map((row: any) => {
        const user = userData.find((u: any) => u.authId === row.user_id);
        const userRole = userRolesData.find((r: any) =>
            r.authId === row.user_id
        );

        return {
            id: row.user_id,
            email: user?.email,
            role: userRole?.role || "user", // Role from User table
            userData: user || null,
        };
    });

    return result;
}

export async function updateSiteWithUsers(siteId: string, formData: FormData) {
    const supabase = await createClient();

    // Check if user is superadmin
    const { getUserContext } = await import("@/lib/auth-utils");
    const userContext = await getUserContext();
    if (!userContext?.canAccessAllOrganizations) {
        return {
            success: false,
            message: "Unauthorized: Only superadmins can update sites",
        };
    }

    const name = formData.get("name") as string;
    const subdomain = formData.get("subdomain") as string;
    const description = formData.get("description") as string;
    const organizationId = formData.get("organization_id") as string;
    const users = formData.getAll("users") as string[]; // Get all users as array

    if (!name || !subdomain || !organizationId) {
        return {
            success: false,
            message: "Name, subdomain, and organization are required.",
        };
    }

    // Update site
    const { error: siteError } = await supabase
        .from("sites")
        .update({
            name,
            subdomain,
            description,
            organization_id: organizationId,
        })
        .eq("id", siteId);
    if (siteError) {
        return {
            success: false,
            message: "Failed to update site: " + siteError.message,
        };
    }

    // Update user_sites: delete old, insert new
    await supabase.from("user_sites").delete().eq("site_id", siteId);
    if (users && users.length > 0) {
        const userRows = users.map((userId) => ({
            site_id: siteId,
            user_id: userId.trim(),
        }));
        const { error: userError } = await supabase.from("user_sites")
            .insert(
                userRows,
            );
        if (userError) {
            return {
                success: false,
                message: "Failed to update users: " + userError.message,
            };
        }
    }

    revalidatePath("/administration/sites");
    return { success: true, message: "Site updated successfully!" };
}

// Helper function to add a user to a site (for debugging/testing)
export async function addUserToSiteHelper(
    siteId: string,
    userId: string,
    role: string = "user",
) {
    const supabase = await createClient();

    // Check if user is already in the site
    const { data: existing } = await supabase
        .from("user_sites")
        .select("*")
        .eq("site_id", siteId)
        .eq("user_id", userId)
        .single();

    if (existing) {
        return {
            success: false,
            message: "User is already in this site",
        };
    }

    // Add user to site
    const { error } = await supabase
        .from("user_sites")
        .insert({
            site_id: siteId,
            user_id: userId,
            role: role,
        });

    if (error) {
        console.error("Error adding user to site:", error);
        return {
            success: false,
            message: error.message,
        };
    }

    revalidatePath(`/administration/sites/${siteId}`);
    return {
        success: true,
        message: "User added to site successfully!",
    };
}

// Helper function to get all available users (for debugging)
export async function getAllAvailableUsers() {
    const supabase = await createClient();

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin
        .listUsers();
    if (authError) {
        console.error("Error fetching auth users:", authError);
        return [];
    }

    // Get user profiles
    const { data: profiles, error: profileError } = await supabase
        .from("User")
        .select("*");

    if (profileError) {
        console.error("Error fetching user profiles:", profileError);
        return authUsers.users.map((user: any) => ({
            id: user.id,
            email: user.email,
            given_name: null,
            family_name: null,
        }));
    }

    // Combine auth users with profiles
    return authUsers.users.map((user: any) => {
        const profile = profiles.find((p: any) => p.authId === user.id);
        return {
            id: user.id,
            email: user.email,
            given_name: profile?.given_name || null,
            family_name: profile?.family_name || null,
        };
    });
}
