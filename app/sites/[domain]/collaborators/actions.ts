"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";

// Type for collaborator update data
interface CollaboratorUpdateData {
    given_name?: string;
    family_name?: string;
    email?: string;
    company_role?: string;
    color?: string;
    initials?: string;
}

/**
 * Check if the current user is an admin for the site's organization
 */
async function checkAdminAccess(
    siteId: string,
): Promise<{ isAdmin: boolean; organizationId: string | null }> {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (!userContext?.user) {
        return { isAdmin: false, organizationId: null };
    }

    // Superadmins have full access
    if (userContext.canAccessAllOrganizations) {
        const { data: site } = await supabase
            .from("sites")
            .select("organization_id")
            .eq("id", siteId)
            .single();
        return { isAdmin: true, organizationId: site?.organization_id || null };
    }

    // Get the site's organization
    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("organization_id")
        .eq("id", siteId)
        .single();

    if (siteError || !site?.organization_id) {
        return { isAdmin: false, organizationId: null };
    }

    // Check if user is an admin and belongs to this organization
    if (
        userContext.role === "admin" &&
        userContext.organizationIds?.includes(site.organization_id)
    ) {
        return { isAdmin: true, organizationId: site.organization_id };
    }

    return { isAdmin: false, organizationId: site.organization_id };
}

/**
 * Get available users that can be added to a site
 * Returns users from the organization that are not already in the site
 */
export async function getAvailableUsersForSite(siteId: string) {
    const supabase = await createClient();
    const { isAdmin, organizationId } = await checkAdminAccess(siteId);

    if (!isAdmin || !organizationId) {
        return { success: false, error: "Non autorizzato", users: [] };
    }

    // Get users already in the site
    const { data: existingSiteUsers } = await supabase
        .from("user_sites")
        .select("user_id")
        .eq("site_id", siteId);

    const existingUserIds = existingSiteUsers?.map((u) => u.user_id) || [];

    // Get all users in the organization
    const { data: orgUsers } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", organizationId);

    const orgUserIds = orgUsers?.map((u) => u.user_id) || [];

    // Get user details for users in the organization but not in the site
    const { data: users, error } = await supabase
        .from("User")
        .select(
            "id, authId, email, given_name, family_name, role, company_role, enabled",
        )
        .in("authId", orgUserIds)
        .not(
            "authId",
            "in",
            `(${
                existingUserIds.length > 0
                    ? existingUserIds.map((id) => `"${id}"`).join(",")
                    : '""'
            })`,
        )
        .eq("enabled", true)
        .neq("role", "superadmin");

    if (error) {
        return { success: false, error: error.message, users: [] };
    }

    return { success: true, users: users || [] };
}

/**
 * Add a user to a site (user_sites table)
 */
export async function addCollaboratorToSite(
    siteId: string,
    userId: string, // This is the authId
    domain: string,
) {
    const supabase = await createClient();
    const { isAdmin } = await checkAdminAccess(siteId);

    if (!isAdmin) {
        return {
            success: false,
            error: "Non autorizzato ad aggiungere collaboratori",
        };
    }

    // Check if user is already in the site
    const { data: existing } = await supabase
        .from("user_sites")
        .select("id")
        .eq("site_id", siteId)
        .eq("user_id", userId)
        .single();

    if (existing) {
        return {
            success: false,
            error: "L'utente è già collegato a questo sito",
        };
    }

    // Add user to site
    const { error } = await supabase
        .from("user_sites")
        .insert({
            site_id: siteId,
            user_id: userId,
        });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/sites/${domain}/collaborators`);
    return { success: true, message: "Collaboratore aggiunto con successo" };
}

/**
 * Remove a user from a site (user_sites table)
 */
export async function removeCollaboratorFromSite(
    siteId: string,
    userId: string, // This is the authId
    domain: string,
) {
    const supabase = await createClient();
    const { isAdmin } = await checkAdminAccess(siteId);

    if (!isAdmin) {
        return {
            success: false,
            error: "Non autorizzato a rimuovere collaboratori",
        };
    }

    // Remove user from site
    const { error } = await supabase
        .from("user_sites")
        .delete()
        .eq("site_id", siteId)
        .eq("user_id", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/sites/${domain}/collaborators`);
    return { success: true, message: "Collaboratore rimosso con successo" };
}

/**
 * Update a collaborator's personal information
 */
export async function updateCollaborator(
    siteId: string,
    userId: string, // This is the authId
    data: CollaboratorUpdateData,
    domain: string,
) {
    const supabase = await createClient();
    const { isAdmin } = await checkAdminAccess(siteId);

    if (!isAdmin) {
        return {
            success: false,
            error: "Non autorizzato a modificare i dati del collaboratore",
        };
    }

    // Update user in User table
    const { error } = await supabase
        .from("User")
        .update({
            given_name: data.given_name,
            family_name: data.family_name,
            company_role: data.company_role,
            color: data.color,
            initials: data.initials,
        })
        .eq("authId", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/sites/${domain}/collaborators`);
    return { success: true, message: "Dati aggiornati con successo" };
}

/**
 * Send password reset email to a collaborator
 */
export async function sendPasswordResetEmail(
    siteId: string,
    userEmail: string,
) {
    const supabase = await createClient();
    const { isAdmin } = await checkAdminAccess(siteId);

    if (!isAdmin) {
        return {
            success: false,
            error: "Non autorizzato a inviare email di reset password",
        };
    }

    // Get base URL
    let baseUrl = process.env.NEXT_PUBLIC_URL;
    if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
    }
    if (!baseUrl) {
        baseUrl = "http://localhost:3000";
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${baseUrl}/auth/reset-password`,
    });

    if (error) {
        return {
            success: false,
            error: `Errore nell'invio dell'email: ${error.message}`,
        };
    }

    return {
        success: true,
        message: "Email di reset password inviata con successo",
    };
}

/**
 * Invite a new user to the site
 * Creates a new user and adds them to the site
 */
export async function inviteNewCollaborator(
    siteId: string,
    email: string,
    givenName: string,
    familyName: string,
    companyRole: string | null,
    domain: string,
) {
    const supabase = await createClient();
    const supabaseService = createServiceClient();
    const { isAdmin, organizationId } = await checkAdminAccess(siteId);

    if (!isAdmin || !organizationId) {
        return {
            success: false,
            error: "Non autorizzato ad invitare nuovi collaboratori",
        };
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
        .from("User")
        .select("authId")
        .eq("email", email)
        .single();

    if (existingUser) {
        // User exists, just add them to the site
        return await addCollaboratorToSite(
            siteId,
            existingUser.authId!,
            domain,
        );
    }

    // Get base URL
    let baseUrl = process.env.NEXT_PUBLIC_URL;
    if (!baseUrl && process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
    }
    if (!baseUrl) {
        baseUrl = "http://localhost:3000";
    }

    // Invite new user
    const { data: inviteData, error: inviteError } = await supabaseService
        .auth.admin.inviteUserByEmail(email, {
            redirectTo: `${baseUrl}/auth/complete-signup?email=${
                encodeURIComponent(email)
            }&name=${encodeURIComponent(givenName)}&last_name=${
                encodeURIComponent(familyName)
            }&role=user&sites=${encodeURIComponent(siteId)}`,
            data: {
                name: givenName,
                last_name: familyName,
            },
        });

    if (inviteError) {
        return {
            success: false,
            error: `Errore nell'invito: ${inviteError.message}`,
        };
    }

    const userId = inviteData.user.id;

    // Create User profile
    const { error: userError } = await supabase
        .from("User")
        .insert({
            authId: userId,
            auth_id: userId,
            email: email,
            given_name: givenName,
            family_name: familyName,
            company_role: companyRole,
            role: "user",
            enabled: false, // Will be enabled after email confirmation
        });

    if (userError) {
        return {
            success: false,
            error: `Errore nella creazione del profilo: ${userError.message}`,
        };
    }

    // Add to user_organizations
    await supabase
        .from("user_organizations")
        .insert({
            organization_id: organizationId,
            user_id: userId,
        });

    // Add to user_sites
    const { error: siteError } = await supabase
        .from("user_sites")
        .insert({
            site_id: siteId,
            user_id: userId,
        });

    if (siteError) {
        return {
            success: false,
            error: `Errore nell'aggiunta al sito: ${siteError.message}`,
        };
    }

    revalidatePath(`/sites/${domain}/collaborators`);
    return {
        success: true,
        message:
            "Invito inviato con successo! L'utente riceverà un'email per completare la registrazione.",
    };
}

/**
 * Toggle collaborator enabled status
 */
export async function toggleCollaboratorStatus(
    siteId: string,
    userId: string, // This is the authId
    enabled: boolean,
    domain: string,
) {
    const supabase = await createClient();
    const { isAdmin } = await checkAdminAccess(siteId);

    if (!isAdmin) {
        return {
            success: false,
            error: "Non autorizzato a modificare lo stato del collaboratore",
        };
    }

    const { error } = await supabase
        .from("User")
        .update({ enabled })
        .eq("authId", userId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath(`/sites/${domain}/collaborators`);
    return {
        success: true,
        message: enabled
            ? "Collaboratore abilitato"
            : "Collaboratore disabilitato",
    };
}

/**
 * Check if current user is admin for the site
 */
export async function checkIsAdmin(siteId: string) {
    const { isAdmin } = await checkAdminAccess(siteId);
    return isAdmin;
}
