"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSiteWithAssociations(
    prevState: any,
    formData: FormData,
) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const subdomain = formData.get("subdomain") as string;
    const description = formData.get("description") as string;
    const organizationId = formData.get("organizations") as string; // now single select
    const users = formData.getAll("users");

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

    // 2. Associate users (site_users join table)
    if (users.length > 0) {
        const userRows = users.map((userId) => ({
            site_id: site.id,
            user_id: userId,
            role: "user",
        }));
        const { error: userError } = await supabase.from("site_users").insert(
            userRows,
        );
        if (userError) {
            return {
                success: false,
                message: "Failed to add users: " + userError.message,
            };
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
    const { data, error } = await supabase
        .from("sites")
        .select("*, organizations:organization_id(*)")
        .eq("id", id)
        .single();
    if (error) return null;
    return data;
}

export async function getSiteUsers(siteId: string) {
    const supabase = await createClient();

    // First, get site_users with auth.users data
    const { data: siteUsersData, error: siteUsersError } = await supabase
        .from("site_users")
        .select("user_id, role")
        .eq("site_id", siteId);

    if (siteUsersError) return [];

    // Then, get User table data for each user
    const userIds = siteUsersData.map((row: any) => row.user_id);
    const { data: userData, error: userError } = await supabase
        .from("User")
        .select("*")
        .in("authId", userIds);

    if (userError) {
        console.error("Error fetching User data:", userError);
    }

    // Combine the data
    return siteUsersData.map((row: any) => {
        const userInfo = userData?.find((user: any) =>
            user.authId === row.user_id
        );
        return {
            id: row.user_id,
            email: row.users?.email,
            role: row.role,
            userData: userInfo || null,
        };
    });
}

export async function updateSiteWithUsers(siteId: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const subdomain = formData.get("subdomain") as string;
    const description = formData.get("description") as string;
    const organizationId = formData.get("organization_id") as string;
    const users = formData.getAll("users");

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

    // Update site_users: delete old, insert new
    await supabase.from("site_users").delete().eq("site_id", siteId);
    if (users.length > 0) {
        const userRows = users.map((userId) => ({
            site_id: siteId,
            user_id: userId,
            role: "user",
        }));
        const { error: userError } = await supabase.from("site_users").insert(
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
