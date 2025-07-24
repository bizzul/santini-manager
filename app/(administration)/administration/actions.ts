"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/* ORGANIZATIONS */

// List all organizations
export async function getOrganizations() {
    const supabase = await createClient();
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
    const organizationName = formData.get("organizationName") as string;
    const adminEmail = formData.get("adminEmail") as string;

    if (!organizationName || !adminEmail) {
        return {
            success: false,
            message: "Organization name and admin email are required.",
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

    // 2. Create the admin user in Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin
        .createUser({
            email: adminEmail,
            email_confirm: true,
            user_metadata: { organization_id: organization.id, role: "admin" },
            password: crypto.randomUUID(), // temporary password
        });

    if (userError || !userData?.user) {
        return {
            success: false,
            message: "Failed to create admin user: " +
                (userError?.message || "Unknown error"),
        };
    }

    // 3. Send password reset email
    const { error: resetError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: adminEmail,
    });
    if (resetError) {
        return {
            success: false,
            message: "Failed to send password reset email: " +
                resetError.message,
        };
    }

    // 4. Insert into tenants table
    const { error: tenantError } = await supabase.from("tenants").insert({
        organization_id: organization.id,
        user_id: userData.user.id,
        role: "admin",
    });
    if (tenantError) {
        return {
            success: false,
            message: "Failed to link admin to organization: " +
                tenantError.message,
        };
    }

    revalidatePath("/administration/organizations");
    return {
        success: true,
        message: "Organization created and admin invited successfully!",
    };
}

// Update organization details
export async function updateOrganization(orgId: string, updates: any) {
    const supabase = await createClient();
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
    const { data, error } = await supabase.from("sites").select("*").eq(
        "organization_id",
        organizationId,
    );
    if (error) return [];
    return data;
}

// Fetch all users connected to an organization (via tenants table)
export async function getOrganizationUsers(organizationId: string) {
    const supabase = await createClient();
    // Join tenants to auth.users (email) via user_id, and to User table via authId
    const { data, error } = await supabase
        .from("tenants")
        // .select(
        //     "user_id, role, auth_user:auth.users(email), user_profile:User!User_authId_fkey(*)",
        // )
        .select("*")
        .eq("organization_id", organizationId);

    const { data: profiles } = await supabase
        .from("User")
        .select("*")
        .in("authId", data?.map((tenant: any) => tenant.user_id) || []);

    if (error) return [];

    return data?.map((tenant: any) => ({
        id: tenant.user_id,
        role: tenant.role,
        email: tenant.auth_user?.email ?? null,
        profile: tenant.user_profile ?? null,
        ...profiles?.find((profile: any) => profile.authId === tenant.user_id),
    })) || [];
}

// Fetch all tenants
export async function getTenants() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("tenants").select("*");
    if (error) throw new Error(error.message);
    return data;
}

/* USERS */

// List all users
export async function getUsers() {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    // Fetch user profiles from User table
    const { data: profiles } = await supabase.from("User").select(
        "authId, given_name, family_name",
    );
    return data.users.map((user: any) => {
        const profile = profiles?.find((p: any) => p.authId === user.id);
        return {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role || "user",
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
    const { error } = await supabase.from("User").update(updates).eq(
        "id",
        userId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    return { success: true };
}

// Block/unblock a user
export async function setUserBlocked(userId: string, blocked: boolean) {
    const supabase = await createClient();
    const { error } = await supabase.from("User").update({ blocked }).eq(
        "id",
        userId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    return { success: true };
}

// Assign a role to a user
export async function assignUserRole(userId: string, role: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("User").update({ role }).eq(
        "id",
        userId,
    );
    if (error) throw new Error(error.message);
    revalidatePath("/administration/users");
    return { success: true };
}

// Create a new user in an organization
export async function createUser(
    prevState: any,
    formData: FormData,
) {
    try {
        const supabase = await createClient();

        // Check if user is superadmin
        const { data: { user }, error: authError } = await supabase.auth
            .getUser();
        if (authError || !user) {
            return {
                success: false,
                message: "Authentication required",
            };
        }

        const { data: userRole } = await supabase
            .from("tenants")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (!userRole || userRole.role !== "superadmin") {
            return {
                success: false,
                message: "Unauthorized: Requires superadmin role",
            };
        }

        const email = formData.get("email") as string;
        const orgId = formData.get("organization") as string;
        const role = formData.get("role") as string;
        const name = formData.get("name") as string;
        const last_name = formData.get("last_name") as string;

        if (!email || !orgId || !role) {
            return {
                success: false,
                message: "Please fill in all fields",
            };
        }

        const supabaseService = await createServiceClient();
        // Create user in Supabase Auth
        const { data: userData, error: inviteError } = await supabaseService
            .auth.admin
            .createUser({
                email: email,
                email_confirm: true,
                user_metadata: { organization_id: orgId, role: role },
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

        // Insert into User table
        const { error: userError } = await supabase.from("User")
            .insert({
                authId: userData.user.id,
                auth_id: userData.user.id,
                email: email,
                given_name: name,
                family_name: last_name,
            });

        if (userError) {
            return {
                success: false,
                message: userError.message,
            };
        }

        // Insert into tenants table
        const { error: tenantError } = await supabase.from("tenants")
            .insert([{
                organization_id: orgId,
                user_id: userData.user.id,
                role,
            }]);

        if (tenantError) {
            return {
                success: false,
                message: tenantError.message,
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

// List all sites
export async function getSites() {
    const supabase = await createClient();
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
    const { error } = await supabase.from("sites").delete().eq("id", siteId);
    if (error) throw new Error(error.message);
    revalidatePath("/administration/sites");
    return { success: true };
}

// Fetch all user profiles from User table
export async function getUserProfiles() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("User").select("*");
    if (error) throw new Error(error.message);
    return data;
}
