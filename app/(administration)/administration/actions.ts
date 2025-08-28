"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";

/* ORGANIZATIONS */

// Check if a user with admin role already exists
export async function checkExistingAdminUser(email: string) {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        return { exists: false, user: null, error: error.message };
    }

    // Get user IDs for users with the given email
    const usersWithEmail = data.users.filter((user: any) =>
        user.email === email
    );

    if (usersWithEmail.length === 0) {
        return { exists: false, user: null, error: null };
    }

    // Check User table for admin role
    const userIds = usersWithEmail.map((user: any) => user.id);
    const { data: userProfiles } = await supabase
        .from("User")
        .select("authId, role")
        .in("authId", userIds);

    const existingAdminUser = usersWithEmail.find((user: any) => {
        const profile = userProfiles?.find((p: any) => p.authId === user.id);
        return profile?.role === "admin";
    });

    return {
        exists: !!existingAdminUser,
        user: existingAdminUser || null,
        error: null,
    };
}

// List all organizations - superadmins see all, others see only their own
export async function getOrganizations() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all organizations
        const { data, error } = await supabase.from("organizations").select(
            "*",
        );
        if (error) throw new Error(error.message);
        return data;
    } else {
        // Regular users see organizations they belong to through user_organizations table
        const { data: userOrgs, error: userOrgsError } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext?.userId);

        if (userOrgsError) throw new Error(userOrgsError.message);
        if (!userOrgs || userOrgs.length === 0) {
            return [];
        }

        const orgIds = userOrgs.map((uo: any) => uo.organization_id);
        const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .in("id", orgIds);
        if (error) throw new Error(error.message);
        return data;
    }
}

// Get organizations with user count for display purposes
export async function getOrganizationsWithUserCount() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all organizations with user counts
        const { data, error } = await supabase
            .from("organizations")
            .select(`
                *,
                user_organizations!inner (
                    user_id
                )
            `);

        if (error) throw new Error(error.message);

        // Count users per organization
        const orgsWithCounts = data?.map((org: any) => ({
            ...org,
            userCount: org.user_organizations?.length || 0,
        })) || [];

        return orgsWithCounts;
    } else {
        // Regular users see organizations they belong to with user counts
        const { data: userOrgs, error: userOrgsError } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext?.userId);

        if (userOrgsError) throw new Error(userOrgsError.message);
        if (!userOrgs || userOrgs.length === 0) {
            return [];
        }

        const orgIds = userOrgs.map((uo: any) => uo.organization_id);
        const { data, error } = await supabase
            .from("organizations")
            .select(`
                *,
                user_organizations!inner (
                    user_id
                )
            `)
            .in("id", orgIds);

        if (error) throw new Error(error.message);

        // Count users per organization
        const orgsWithCounts = data?.map((org: any) => ({
            ...org,
            userCount: org.user_organizations?.length || 0,
        })) || [];

        return orgsWithCounts;
    }
}

// Get all organizations (for superadmins only - used in dropdowns, etc.)
export async function getAllOrganizations() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can access all organizations",
        );
    }

    const { data, error } = await supabase.from("organizations").select("*");
    if (error) throw new Error(error.message);
    return data;
}

// Create a new organization and invite an admin user
export async function createOrganizationAndInviteUser(
    prevState: any,
    formData: FormData,
) {
    const supabase = await createClient();

    // Check if user is superadmin
    const userContext = await getUserContext();
    if (!userContext?.canAccessAllOrganizations) {
        return {
            success: false,
            message: "Unauthorized: Only superadmins can create organizations",
        };
    }

    const organizationName = formData.get("organizationName") as string;
    const adminEmail = formData.get("adminEmail") as string;

    if (!organizationName || !adminEmail) {
        return {
            success: false,
            message: "Organization name and admin email are required.",
        };
    }

    // Check if organization name already exists
    const { data: existingOrg, error: orgCheckError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("name", organizationName)
        .single();

    if (existingOrg) {
        return {
            success: false,
            message:
                `Organization name "${organizationName}" already exists. Please choose a different name.`,
        };
    }

    if (orgCheckError && orgCheckError.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected for new names
        return {
            success: false,
            message: "Failed to check organization name: " +
                orgCheckError.message,
        };
    }

    // Generate a random code for the organization
    function generateOrganizationCode(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // 1. Create the organization
    const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({
            name: organizationName,
            code: generateOrganizationCode(),
        })
        .select()
        .single();

    if (orgError || !organization) {
        return {
            success: false,
            message: "Failed to create organization: " +
                (orgError?.message || "Unknown error"),
        };
    }

    // 2. Check if user with admin role already exists in User table
    const { data: existingUser, error: userCheckError } = await supabase
        .from("User")
        .select("authId, email, role")
        .eq("email", adminEmail)
        .single();

    let existingAdminUser = null;
    if (!userCheckError && existingUser) {
        existingAdminUser = existingUser;
    }

    let userId: string;
    let isExistingUser = false;
    let userRole = "admin"; // Default role for new users

    if (existingAdminUser) {
        // Use existing user - check their current role
        userId = existingAdminUser.authId;
        isExistingUser = true;

        // Check if user already has admin or superadmin role in User table
        const { data: userProfile } = await supabase
            .from("User")
            .select("role")
            .eq("authId", userId)
            .single();

        if (!userProfile) {
            return {
                success: false,
                message: "User profile not found for existing user",
            };
        }

        // Check if user has appropriate role (admin or superadmin)
        if (userProfile.role !== "admin" && userProfile.role !== "superadmin") {
            return {
                success: false,
                message:
                    `User ${adminEmail} already exists but doesn't have admin or superadmin privileges. Only users with appropriate permissions can be organization admins.`,
            };
        }

        // If user is superadmin, don't change their role
        // If user is admin, that's fine too
        userRole = userProfile.role; // Store the actual user role
    } else {
        // Create new admin user using service client for elevated privileges
        const supabaseService = createServiceClient();

        // Use inviteUserByEmail which handles existing users gracefully
        const { data: inviteData, error: inviteError } = await supabaseService
            .auth.admin
            .inviteUserByEmail(adminEmail, {
                redirectTo:
                    `${process.env.APP_URL}/auth/complete-signup?email=${
                        encodeURIComponent(adminEmail)
                    }`,
            });

        if (inviteError) {
            return {
                success: false,
                message: "Failed to send invitation: " + inviteError.message,
            };
        }

        // Get the user ID from the invitation response
        userId = inviteData.user.id;
    }

    // 4. Insert into user_organizations table
    const { error: userOrgError } = await supabase.from("user_organizations")
        .insert({
            organization_id: organization.id,
            user_id: userId,
        });
    if (userOrgError) {
        return {
            success: false,
            message: "Failed to link admin to organization: " +
                userOrgError.message,
        };
    }

    revalidatePath("/administration/organizations");
    return {
        success: true,
        message: isExistingUser
            ? `Organization created and connected to existing ${userRole} user ${adminEmail}!`
            : `Organization created and ${userRole} invited successfully!`,
    };
}

// Update organization details
export async function updateOrganization(orgId: string, updates: any) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user is superadmin
    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can update organizations",
        );
    }

    const { error } = await supabase.from("organizations").update(updates).eq(
        "id",
        orgId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/organizations");
    return { success: true };
}

// Delete an organization
export async function deleteOrganization(orgId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user is superadmin
    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can delete organizations",
        );
    }

    const { error } = await supabase.from("organizations").delete().eq(
        "id",
        orgId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/organizations");
    return { success: true };
}

// Fetch a single organization by ID
export async function getOrganizationById(id: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(id)
    ) {
        return null;
    }

    const { data, error } = await supabase.from("organizations").select("*").eq(
        "id",
        id,
    ).single();
    if (error) return null;
    return data;
}

// Fetch all sites connected to an organization
export async function getOrganizationSites(organizationId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(organizationId)
    ) {
        return [];
    }

    const { data, error } = await supabase.from("sites").select("*").eq(
        "organization_id",
        organizationId,
    );
    if (error) return [];
    return data;
}

// Get all organization sites (for superadmins only - used in dropdowns, etc.)
export async function getAllOrganizationSites() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can access all organization sites",
        );
    }

    const { data, error } = await supabase
        .from("sites")
        .select("*, organization:organizations(*)");
    if (error) throw new Error(error.message);
    return data;
}

// Fetch all users connected to an organization (via user_organizations table)
export async function getOrganizationUsers(organizationId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(organizationId)
    ) {
        return [];
    }

    // Get user-organization relationships with user information and profiles
    const { data, error } = await supabase
        .from("user_organizations")
        .select(`
            user_id,
            created_at
        `)
        .eq("organization_id", organizationId);

    if (error) {
        console.error("Error fetching organization users:", error);
        return [];
    }

    // Get user details for each user_id
    const userIds = data?.map((userOrg: any) => userOrg.user_id) || [];

    if (userIds.length === 0) return [];

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
        .from("User")
        .select("authId, given_name, family_name, role, email")
        .in("authId", userIds);

    if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
        return [];
    }

    // Create a map of user profiles by authId
    const profilesMap = new Map();
    profiles?.forEach((profile: any) => {
        profilesMap.set(profile.authId, profile);
    });

    // Return combined data
    return data?.map((userOrg: any) => {
        const profile = profilesMap.get(userOrg.user_id);
        return {
            id: userOrg.user_id,
            role: profile?.role || "user",
            joinedAt: userOrg.created_at,
            email: profile?.email || "",
            givenName: profile?.given_name || "",
            familyName: profile?.family_name || "",
            fullName:
                `${profile?.given_name || ""} ${profile?.family_name || ""}`
                    .trim() || "Unknown",
            profile: profile,
        };
    }) || [];
}

// Get all organization users (for superadmins only - used in dropdowns, etc.)
export async function getAllOrganizationUsers() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can access all organization users",
        );
    }

    // Get all user-organization relationships with user and organization info
    const { data: userOrgs, error: userOrgsError } = await supabase
        .from("user_organizations")
        .select(`
            user_id,
            created_at,
            organization:organizations (
                id,
                name,
                code
            ),
            users:auth.users (
                id,
                email
            ),
            profiles:User (
                authId,
                given_name,
                family_name,
                role
            )
        `);

    if (userOrgsError) return [];

    return userOrgs?.map((userOrg: any) => ({
        id: userOrg.user_id,
        role: userOrg.profiles?.role || "user",
        joinedAt: userOrg.created_at,
        organization: userOrg.organization,
        email: userOrg.users?.email || "",
        givenName: userOrg.profiles?.given_name || "",
        familyName: userOrg.profiles?.family_name || "",
        fullName:
            `${userOrg.profiles?.given_name || ""} ${
                userOrg.profiles?.family_name || ""
            }`.trim() || "Unknown",
        profile: userOrg.profiles,
    })) || [];
}

// Fetch all user-organization relationships - superadmins see all, others see only their organization's relationships
export async function getAllUserOrganizations() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all user-organization relationships
        const { data, error } = await supabase.from("user_organizations")
            .select("*");
        if (error) throw new Error(error.message);
        return data;
    } else {
        // Regular users see only their organizations' relationships
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext?.userId);

        if (!userOrgs || userOrgs.length === 0) return [];

        const orgIds = userOrgs.map((uo: any) => uo.organization_id);
        const { data, error } = await supabase
            .from("user_organizations")
            .select("*")
            .in("organization_id", orgIds);
        if (error) throw new Error(error.message);
        return data;
    }
}

// Get all user-organization relationships (for superadmins only - used in dropdowns, etc.)
export async function getAllUserOrganizationsAdmin() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can access all user-organization relationships",
        );
    }

    const { data, error } = await supabase.from("user_organizations").select(
        "*",
    );
    if (error) throw new Error(error.message);
    return data;
}

/* USERS */

// List all users - superadmins see all, others see only their organization's users
export async function getUsers() {
    const supabase = await createServiceClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all users
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw new Error(error.message);
        // Fetch user profiles from User table
        const { data: profiles } = await supabase.from("User").select(
            "authId, given_name, family_name, role",
        );
        return data.users.map((user: any) => {
            const profile = profiles?.find((p: any) => p.authId === user.id);
            return {
                id: user.id,
                email: user.email,
                role: profile?.role || "user",
                given_name: profile?.given_name || "",
                family_name: profile?.family_name || "",
            };
        });
    } else {
        // Regular users see only their organizations' users
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext?.userId);

        if (!userOrgs || userOrgs.length === 0) return [];

        const orgIds = userOrgs.map((uo: any) => uo.organization_id);

        // Get all users who belong to the same organizations
        const { data: orgUserOrgs } = await supabase
            .from("user_organizations")
            .select("user_id")
            .in("organization_id", orgIds);

        if (!orgUserOrgs || orgUserOrgs.length === 0) return [];

        const userIds = orgUserOrgs.map((uo: any) => uo.user_id);

        // Get all users from auth (we'll filter them)
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw new Error(error.message);

        // Filter users to only those in the user's organizations
        const orgUsers = data.users.filter((user: any) =>
            userIds.includes(user.id)
        );

        // Fetch user profiles from User table
        const { data: profiles } = await supabase.from("User").select(
            "authId, given_name, family_name, role",
        );

        return orgUsers.map((user: any) => {
            const profile = profiles?.find((p: any) => p.authId === user.id);
            return {
                id: user.id,
                email: user.email,
                role: profile?.role || "user",
                given_name: profile?.given_name || "",
                family_name: profile?.family_name || "",
            };
        });
    }
}

// Get all users (for superadmins only - used in dropdowns, etc.)
export async function getAllUsers() {
    const supabase = await createServiceClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error("Unauthorized: Only superadmins can access all users");
    }

    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw new Error(error.message);

    // Fetch user profiles from User table
    const { data: profiles } = await supabase.from("User").select(
        "authId, given_name, family_name, role",
    );

    return data.users.map((user: any) => {
        const profile = profiles?.find((p: any) => p.authId === user.id);
        return {
            id: user.id,
            email: user.email,
            role: profile?.role || "user",
            given_name: profile?.given_name || "",
            family_name: profile?.family_name || "",
        };
    });
}

// Invite a new user to an organization
export async function inviteUserToOrganization(
    prevState: any,
    formData: FormData,
) {
    // ...your logic here
    return { success: true, message: "User invited successfully!" };
}

// Update user info
export async function updateUser(userId: string, updates: any) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Get the user's organizations to check access
    const { data: userOrgs } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId);

    if (!userOrgs || userOrgs.length === 0) {
        throw new Error("User not found in any organization");
    }

    const userOrgIds = userOrgs.map((uo: any) => uo.organization_id);

    // Check if user has access to any of this user's organizations
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.some((id: string) =>
            userOrgIds.includes(id)
        )
    ) {
        throw new Error(
            "Unauthorized: You can only update users in organizations you belong to",
        );
    }

    // Check if user is trying to update to superadmin role without permission
    if (
        updates.role === "superadmin" && !userContext?.canAccessAllOrganizations
    ) {
        throw new Error(
            "Unauthorized: Only superadmins can assign superadmin roles",
        );
    }

    // Extract organization IDs from updates if present
    const { organization, ...userUpdates } = updates;

    // Update user info in User table
    if (Object.keys(userUpdates).length > 0) {
        const { error } = await supabase.from("User").update(userUpdates).eq(
            "authId",
            userId,
        );
        if (error) throw new Error(error.message);
    }

    // Update organizations if provided
    if (organization && Array.isArray(organization)) {
        // Delete existing user-organization relationships
        const { error: deleteError } = await supabase
            .from("user_organizations")
            .delete()
            .eq("user_id", userId);

        if (deleteError) throw new Error(deleteError.message);

        // Insert new user-organization relationships
        if (organization.length > 0) {
            const userOrgInserts = organization.map((orgId: string) => ({
                organization_id: orgId,
                user_id: userId,
            }));

            const { error: insertError } = await supabase
                .from("user_organizations")
                .insert(userOrgInserts);

            if (insertError) throw new Error(insertError.message);
        }
    }

    revalidatePath("/administration/users");
    return { success: true };
}

// Block/unblock a user
export async function setUserBlocked(userId: string, blocked: boolean) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Get the user's organizations to check access
    const { data: userOrgs } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId);

    if (!userOrgs || userOrgs.length === 0) {
        throw new Error("User not found in any organization");
    }

    const userOrgIds = userOrgs.map((uo: any) => uo.organization_id);

    // Check if user has access to any of this user's organizations
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.some((id: string) =>
            userOrgIds.includes(id)
        )
    ) {
        throw new Error(
            "Unauthorized: You can only block/unblock users in organizations you belong to",
        );
    }

    const { error } = await supabase.from("User").update({ blocked }).eq(
        "id",
        userId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    return { success: true };
}

// Update a user's global role
export async function updateUserRole(
    userId: string,
    role: string,
) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to update roles
    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can update user roles",
        );
    }

    // Update the role in the User table
    const { error } = await supabase
        .from("User")
        .update({ role })
        .eq("authId", userId);

    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    return { success: true };
}

// Add a user to multiple organizations
export async function addUserToOrganizations(
    userId: string,
    organizationIds: string[],
) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to all organizations
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.every((id: string) =>
            organizationIds.includes(id)
        )
    ) {
        throw new Error(
            "Unauthorized: You can only add users to organizations you belong to",
        );
    }

    // Add user to each organization
    for (const organizationId of organizationIds) {
        const { error } = await supabase
            .from("user_organizations")
            .insert({
                user_id: userId,
                organization_id: organizationId,
            })
            .single();

        if (error && error.code !== "23505") { // Ignore duplicate key errors
            throw new Error(error.message);
        }
    }

    revalidatePath("/administration/users");
    return { success: true };
}

// Add a user to an organization
export async function addUserToOrganization(
    userId: string,
    organizationId: string,
) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(organizationId)
    ) {
        throw new Error(
            "Unauthorized: You can only add users to organizations you belong to",
        );
    }

    // Check if user is already in this organization
    const { data: existingUserOrg } = await supabase
        .from("user_organizations")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .single();

    if (existingUserOrg) {
        throw new Error("User is already a member of this organization");
    }

    // Add user to organization
    const { error } = await supabase
        .from("user_organizations")
        .insert({
            user_id: userId,
            organization_id: organizationId,
        });

    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    revalidatePath("/administration/organizations");
    return {
        success: true,
        message: "User added to organization successfully",
    };
}

// Remove a user from an organization
export async function removeUserFromOrganization(
    userId: string,
    organizationId: string,
) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(organizationId)
    ) {
        throw new Error(
            "Unauthorized: You can only remove users from organizations you belong to",
        );
    }

    // Check if user is the last admin in the organization
    const { data: admins } = await supabase
        .from("User")
        .select("authId")
        .eq("role", "admin");

    // Get users who are admins and belong to this organization
    const { data: orgAdmins } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", organizationId)
        .in("user_id", admins?.map((a) => a.authId) || []);

    if (
        orgAdmins && orgAdmins.length === 1 && orgAdmins[0].user_id === userId
    ) {
        throw new Error("Cannot remove the last admin from an organization");
    }

    // Remove user from organization
    const { error } = await supabase
        .from("user_organizations")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    revalidatePath("/administration/organizations");
    return {
        success: true,
        message: "User removed from organization successfully",
    };
}

// Get user's organizations
export async function getUserOrganizations(userId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this user's organizations
    if (
        !userContext?.canAccessAllOrganizations &&
        userContext?.userId !== userId
    ) {
        // Check if user shares any organizations with the target user
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userId);

        const userOrgIds = userOrgs?.map((uo: any) => uo.organization_id) ||
            [];
        const hasSharedOrg = userContext?.organizationIds?.some((id: string) =>
            userOrgIds.includes(id)
        );

        if (!hasSharedOrg) {
            throw new Error(
                "Unauthorized: You can only view organizations you share with this user",
            );
        }
    }

    // Get user's organizations
    const { data, error } = await supabase
        .from("user_organizations")
        .select(`
            organization_id,
            organizations (
                id,
                name,
                code
            )
        `)
        .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return data || [];
}

// Get organization's users with roles
export async function getOrganizationUsersWithRoles(organizationId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(organizationId)
    ) {
        throw new Error(
            "Unauthorized: You can only view users in organizations you belong to",
        );
    }

    // Get organization's users with roles and profiles
    const { data, error } = await supabase
        .from("user_organizations")
        .select(`
            user_id,
            created_at,
            users:auth.users (
                id,
                email
            ),
            profiles:User (
                authId,
                given_name,
                family_name,
                role
            )
        `)
        .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);

    // Transform the data for easier consumption
    return (data || []).map((userOrg: any) => ({
        userId: userOrg.user_id,
        role: userOrg.profiles?.role || "user",
        joinedAt: userOrg.created_at,
        email: userOrg.users?.email || "",
        givenName: userOrg.profiles?.given_name || "",
        familyName: userOrg.profiles?.family_name || "",
        fullName:
            `${userOrg.profiles?.given_name || ""} ${
                userOrg.profiles?.family_name || ""
            }`.trim() || "Unknown",
    }));
}

// Create a new user in an organization
export async function createUser(
    prevState: any,
    formData: FormData,
) {
    try {
        const supabase = await createClient();

        // Check if user is superadmin or admin in the target organization
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();
        if (authError || !user) {
            return {
                success: false,
                message: "Authentication required",
            };
        }

        const userContext = await getUserContext();
        if (!userContext) {
            return {
                success: false,
                message: "User context not found",
            };
        }

        const email = formData.get("email") as string;
        const orgIds = formData.getAll("organization") as string[];
        const role = formData.get("role") as string;
        const name = formData.get("name") as string;
        const last_name = formData.get("last_name") as string;

        if (!email || !orgIds.length || !role) {
            return {
                success: false,
                message: "Please fill in all fields",
            };
        }

        // Check if user can create users in the target organizations
        if (!userContext.canAccessAllOrganizations) {
            const userOrgIds = userContext.organizationIds || [];
            const canCreateInAll = orgIds.every((orgId) =>
                userOrgIds.includes(orgId)
            );
            if (!canCreateInAll) {
                return {
                    success: false,
                    message:
                        "Unauthorized: You can only create users in organizations you belong to",
                };
            }
        }

        // Check if user can create users with the specified role
        if (role === "superadmin" && !userContext.canAccessAllOrganizations) {
            return {
                success: false,
                message:
                    "Unauthorized: Only superadmins can create superadmin users",
            };
        }

        const supabaseService = await createServiceClient();
        // Create user in Supabase Auth
        const { data: userData, error: inviteError } = await supabaseService
            .auth.admin
            .createUser({
                email: email,
                email_confirm: true,
                password: crypto.randomUUID(), // temporary password
            });

        if (inviteError) {
            return {
                success: false,
                message: inviteError.message,
            };
        }

        // Send password reset email
        const { error: resetError } = await supabaseService.auth.admin
            .generateLink({
                type: "recovery",
                email: email,
            });

        if (resetError) {
            return {
                success: false,
                message: resetError.message,
            };
        }

        // Insert into User table with role
        const { error: userError } = await supabase.from("User")
            .insert({
                authId: userData.user.id,
                auth_id: userData.user.id,
                email: email,
                given_name: name,
                family_name: last_name,
                role: role,
            });

        if (userError) {
            return {
                success: false,
                message: userError.message,
            };
        }

        // Insert into user_organizations table for each organization
        const userOrgInserts = orgIds.map((orgId) => ({
            organization_id: orgId,
            user_id: userData.user.id,
        }));

        const { error: userOrgError } = await supabase.from(
            "user_organizations",
        )
            .insert(userOrgInserts);

        if (userOrgError) {
            return {
                success: false,
                message: userOrgError.message,
            };
        }

        revalidatePath("/administration/users");
        return {
            success: true,
            message:
                "User invited successfully! They will receive an email to set their password.",
        };
    } catch (error: any) {
        console.error("Error creating user:", error);
        return {
            success: false,
            message: error.message || "Internal server error",
        };
    }
}

/* SITES */

// List all sites - superadmins see all, others see only their accessible sites
export async function getSites() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all sites
        const { data, error } = await supabase
            .from("sites")
            .select("*, organization:organizations(*)");
        if (error) throw new Error(error.message);
        return data;
    } else {
        // Regular users see sites they have access to through user_sites table
        const { data: userSites, error: userSitesError } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", userContext?.userId);

        if (userSitesError) throw new Error(userSitesError.message);
        if (!userSites || userSites.length === 0) {
            return [];
        }

        const siteIds = userSites.map((us: any) => us.site_id);
        const { data, error } = await supabase
            .from("sites")
            .select("*, organization:organizations(*)")
            .in("id", siteIds);
        if (error) throw new Error(error.message);
        return data;
    }
}

// Get all sites (for superadmins only - used in dropdowns, etc.)
export async function getAllSites() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error("Unauthorized: Only superadmins can access all sites");
    }

    const { data, error } = await supabase
        .from("sites")
        .select("*, organization:organizations(*)");
    if (error) throw new Error(error.message);
    return data;
}

// Create a new site
export async function createSite(prevState: any, formData: FormData) {
    // ...your logic here
    return { success: true, message: "Site created successfully!" };
}

// Update site details
export async function updateSite(siteId: string, updates: any) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this site through user_sites table
    if (!userContext?.canAccessAllOrganizations) {
        const { data: userSite } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", userContext?.userId)
            .eq("site_id", siteId)
            .single();

        if (!userSite) {
            throw new Error(
                "Unauthorized: You can only update sites you have access to",
            );
        }
    }

    const { error } = await supabase.from("sites").update(updates).eq(
        "id",
        siteId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/sites");
    return { success: true };
}

// Delete a site
export async function deleteSite(siteId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user is superadmin
    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can delete sites",
        );
    }

    // Start a transaction to ensure data consistency
    // Delete all related records first to maintain referential integrity

    // 1. Delete user-site associations
    const { error: deleteUserSitesError } = await supabase
        .from("user_sites")
        .delete()
        .eq("site_id", siteId);

    if (deleteUserSitesError) {
        throw new Error(
            `Failed to delete user-site associations: ${deleteUserSitesError.message}`,
        );
    }

    // 2. Delete site modules
    const { error: deleteSiteModulesError } = await supabase
        .from("site_modules")
        .delete()
        .eq("site_id", siteId);

    if (deleteSiteModulesError) {
        throw new Error(
            `Failed to delete site modules: ${deleteSiteModulesError.message}`,
        );
    }

    // 3. Delete clients associated with this site
    const { error: deleteClientsError } = await supabase
        .from("Client")
        .delete()
        .eq("site_id", siteId);

    if (deleteClientsError) {
        throw new Error(
            `Failed to delete site clients: ${deleteClientsError.message}`,
        );
    }

    // 4. Now delete the site itself
    const { error: deleteSiteError } = await supabase
        .from("sites")
        .delete()
        .eq("id", siteId);

    if (deleteSiteError) {
        throw new Error(`Failed to delete site: ${deleteSiteError.message}`);
    }

    revalidatePath("/administration/sites");
    return { success: true };
}

// Fetch all user profiles from User table - superadmins see all, others see only their organization's users
export async function getUserProfiles() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all user profiles
        const { data, error } = await supabase.from("User").select("*");
        if (error) throw new Error(error.message);
        return data;
    } else {
        // Regular users see only their organizations' user profiles
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext?.userId);

        if (!userOrgs || userOrgs.length === 0) return [];

        const orgIds = userOrgs.map((uo: any) => uo.organization_id);

        // Get all users who belong to the same organizations
        const { data: orgUserOrgs } = await supabase
            .from("user_organizations")
            .select("user_id")
            .in("organization_id", orgIds);

        if (!orgUserOrgs || orgUserOrgs.length === 0) return [];

        const userIds = orgUserOrgs.map((uo: any) => uo.user_id);
        const { data, error } = await supabase
            .from("User")
            .select("*")
            .in("authId", userIds);

        if (error) throw new Error(error.message);
        return data;
    }
}

// Get all user profiles (for superadmins only - used in dropdowns, etc.)
export async function getAllUserProfiles() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can access all user profiles",
        );
    }

    const { data, error } = await supabase.from("User").select("*");
    if (error) throw new Error(error.message);
    return data;
}

/* NEW FUNCTIONS FOR MANY-TO-MANY RELATIONSHIPS */

// Add a user to a site
export async function addUserToSite(
    userId: string,
    siteId: string,
) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this site
    if (!userContext?.canAccessAllOrganizations) {
        const { data: userSite } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", userContext?.userId)
            .eq("site_id", siteId)
            .single();

        if (!userSite) {
            throw new Error(
                "Unauthorized: You can only add users to sites you have access to",
            );
        }
    }

    // Check if user is already in this site
    const { data: existingUserSite } = await supabase
        .from("user_sites")
        .select("id")
        .eq("user_id", userId)
        .eq("site_id", siteId)
        .single();

    if (existingUserSite) {
        throw new Error("User is already a member of this site");
    }

    const { error } = await supabase.from("user_sites").insert({
        user_id: userId,
        site_id: siteId,
    });

    if (error) throw new Error(error.message);
    revalidatePath("/administration/sites");
    return { success: true };
}

// Remove a user from a site
export async function removeUserFromSite(userId: string, siteId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this site
    if (!userContext?.canAccessAllOrganizations) {
        const { data: userSite } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", userContext?.userId)
            .eq("site_id", siteId)
            .single();

        if (!userSite) {
            throw new Error(
                "Unauthorized: You can only remove users from sites you have access to",
            );
        }
    }

    const { error } = await supabase
        .from("user_sites")
        .delete()
        .eq("user_id", userId)
        .eq("site_id", siteId);

    if (error) throw new Error(error.message);
    revalidatePath("/administration/sites");
    return { success: true };
}

// Get all users for a specific site
export async function getSiteUsers(siteId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this site
    if (!userContext?.canAccessAllOrganizations) {
        const { data: userSite } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", userContext?.userId)
            .eq("site_id", siteId)
            .single();

        if (!userSite) {
            return [];
        }
    }

    const { data, error } = await supabase
        .from("user_sites")
        .select(`
            user_id,
            created_at,
            user:User!user_sites_user_id_fkey(*)
        `)
        .eq("site_id", siteId);

    if (error) return [];
    return data;
}

// Get all sites for a specific user
export async function getUserSites(userId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this user's data
    if (
        !userContext?.canAccessAllOrganizations &&
        userContext?.userId !== userId
    ) {
        // Check if they share any organizations
        const { data: userTenants } = await supabase
            .from("tenants")
            .select("organization_id")
            .eq("user_id", userId);

        const userOrgIds = userTenants?.map((t: any) => t.organization_id) ||
            [];
        const currentUserOrgIds = userContext?.organizationIds || [];

        const hasSharedOrg = userOrgIds.some((id: string) =>
            currentUserOrgIds.includes(id)
        );

        if (!hasSharedOrg) {
            return [];
        }
    }

    const { data, error } = await supabase
        .from("user_sites")
        .select(`
            site_id,
            role,
            created_at,
            site:sites(*)
        `)
        .eq("user_id", userId);

    if (error) return [];
    return data;
}

// Get user access summary using the new view
export async function getUserAccessSummary(userId?: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userId && !userContext?.canAccessAllOrganizations) {
        // Check if user has access to this user's data
        if (userContext?.userId !== userId) {
            // Check if they share any organizations
            const { data: userTenants } = await supabase
                .from("tenants")
                .select("organization_id")
                .eq("user_id", userId);

            const userOrgIds = userTenants?.map((t: any) =>
                t.organization_id
            ) || [];
            const currentUserOrgIds = userContext?.organizationIds || [];

            const hasSharedOrg = userOrgIds.some((id: string) =>
                currentUserOrgIds.includes(id)
            );

            if (!hasSharedOrg) {
                return null;
            }
        }
    }

    const query = supabase.from("user_access_summary").select("*");
    if (userId) {
        query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) return null;
    return data;
}

// Get site modules for a specific site
export async function getSiteModules(siteId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this site
    if (!userContext?.canAccessAllOrganizations) {
        const { data: userSite } = await supabase
            .from("user_sites")
            .select("site_id")
            .eq("user_id", userContext?.userId)
            .eq("site_id", siteId)
            .single();

        if (!userSite) {
            throw new Error(
                "Unauthorized: You can only view modules for sites you have access to",
            );
        }
    }

    // Get enabled modules for this site
    const { data: siteModules, error } = await supabase
        .from("site_modules")
        .select("module_name, is_enabled")
        .eq("site_id", siteId);

    if (error) {
        throw new Error(`Failed to fetch site modules: ${error.message}`);
    }

    // Import AVAILABLE_MODULES dynamically to avoid client-side issues
    const { AVAILABLE_MODULES } = await import("@/lib/module-config");

    // Create a map of enabled modules
    const enabledModules = new Map(
        siteModules?.map((sm) => [sm.module_name, sm.is_enabled]) || [],
    );

    // Return all available modules with their enabled status
    const modulesWithStatus = AVAILABLE_MODULES.map((module) => ({
        ...module,
        isEnabled: enabledModules.get(module.name) ?? module.enabledByDefault,
    }));

    return { modules: modulesWithStatus };
}

// Update site modules (superadmin only)
export async function updateSiteModules(siteId: string, modules: any[]) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has superadmin role
    if (
        !userContext?.canAccessAllOrganizations ||
        userContext?.role !== "superadmin"
    ) {
        throw new Error(
            "Unauthorized: Only superadmins can modify site modules",
        );
    }

    // Validate modules data
    if (!modules || !Array.isArray(modules)) {
        throw new Error("Invalid modules data");
    }

    // Update modules for this site
    const updates = modules.map((module: any) => ({
        site_id: siteId,
        module_name: module.name,
        is_enabled: module.isEnabled,
    }));

    const { error } = await supabase
        .from("site_modules")
        .upsert(updates, { onConflict: "site_id,module_name" });

    if (error) {
        throw new Error(`Failed to update site modules: ${error.message}`);
    }

    revalidatePath("/administration/sites");
    return { success: true };
}

// Get all available admin and superadmin users
export async function getAvailableAdminUsers() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Only superadmins can see all admin users
    if (
        !userContext?.canAccessAllOrganizations ||
        userContext?.role !== "superadmin"
    ) {
        throw new Error(
            "Unauthorized: Only superadmins can view all admin users",
        );
    }

    const { data, error } = await supabase
        .from("User")
        .select("authId, email, given_name, family_name, role")
        .in("role", ["admin", "superadmin"])
        .order("role", { ascending: false }) // superadmin first, then admin
        .order("given_name", { ascending: true });

    if (error) {
        throw new Error(`Failed to fetch admin users: ${error.message}`);
    }

    return data;
}

// Get current admin user for an organization
export async function getOrganizationAdminUser(
    organizationId: string,
): Promise<
    {
        authId: string | null;
        email: string;
        given_name: string | null;
        family_name: string | null;
        role: string | null;
    } | null
> {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user has access to this organization
    if (
        !userContext?.canAccessAllOrganizations &&
        !userContext?.organizationIds?.includes(organizationId)
    ) {
        throw new Error(
            "Unauthorized: You can only view organizations you belong to",
        );
    }

    // Get all users in the organization
    const { data: userOrgs, error } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", organizationId);

    if (error) {
        throw new Error(`Failed to fetch organization users: ${error.message}`);
    }

    if (!userOrgs || userOrgs.length === 0) {
        return null;
    }

    // Get user details for all users in the organization
    const userIds = userOrgs.map((org) => org.user_id);
    const { data: users, error: usersError } = await supabase
        .from("User")
        .select("authId, email, given_name, family_name, role")
        .in("authId", userIds);

    if (usersError) {
        throw new Error(`Failed to fetch user details: ${usersError.message}`);
    }

    // Find the user with admin or superadmin role
    const adminUser = users?.find((user: any) =>
        user.role === "admin" || user.role === "superadmin"
    );

    return adminUser || null;
}

// Update organization admin user
export async function updateOrganizationAdminUser(
    organizationId: string,
    newAdminUserId: string,
) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Only superadmins can change organization admins
    if (
        !userContext?.canAccessAllOrganizations ||
        userContext?.role !== "superadmin"
    ) {
        throw new Error(
            "Unauthorized: Only superadmins can change organization admins",
        );
    }

    // Verify the new admin user exists and has appropriate role
    const { data: newAdminUser, error: userCheckError } = await supabase
        .from("User")
        .select("authId, email, role")
        .eq("authId", newAdminUserId)
        .in("role", ["admin", "superadmin"])
        .single();

    if (userCheckError || !newAdminUser) {
        throw new Error("Selected user is not a valid admin or superadmin");
    }

    // Get current admin user
    const currentAdmin = await getOrganizationAdminUser(organizationId);

    // Since we can't change user roles directly, we need to:
    // 1. Remove the current admin from the organization
    // 2. Add the new admin to the organization

    try {
        // Remove current admin from organization
        if (currentAdmin && currentAdmin.authId) {
            const { error: removeError } = await supabase
                .from("user_organizations")
                .delete()
                .eq("organization_id", organizationId)
                .eq("user_id", currentAdmin.authId);

            if (removeError) {
                throw new Error(
                    `Failed to remove current admin: ${removeError.message}`,
                );
            }
        }

        // Add new admin to organization
        const { error: addError } = await supabase
            .from("user_organizations")
            .upsert({
                organization_id: organizationId,
                user_id: newAdminUserId,
            }, { onConflict: "organization_id,user_id" });

        if (addError) {
            throw new Error(`Failed to add new admin: ${addError.message}`);
        }
    } catch (error: any) {
        throw new Error(
            `Failed to update organization admin: ${error.message}`,
        );
    }

    revalidatePath("/administration/organizations");
    return { success: true };
}
