"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

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

// Get organizations with user count and site count
export async function getOrganizationsWithSiteCount() {
    const supabase = await createClient();
    const userContext = await getUserContext();

    if (userContext?.canAccessAllOrganizations) {
        // Superadmin can see all organizations
        const { data: orgs, error } = await supabase
            .from("organizations")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);

        // Get user counts per organization
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id");

        // Get site counts per organization
        const { data: sites } = await supabase
            .from("sites")
            .select("organization_id");

        // Count users and sites per organization
        const orgsWithCounts = orgs?.map((org: any) => ({
            ...org,
            userCount: userOrgs?.filter(
                (uo: any) => uo.organization_id === org.id,
            ).length || 0,
            siteCount: sites?.filter((s: any) => s.organization_id === org.id)
                .length || 0,
        })) || [];

        return orgsWithCounts;
    } else {
        // Regular users see organizations they belong to
        const { data: userOrgsForUser, error: userOrgsError } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", userContext?.userId);

        if (userOrgsError) throw new Error(userOrgsError.message);
        if (!userOrgsForUser || userOrgsForUser.length === 0) {
            return [];
        }

        const orgIds = userOrgsForUser.map((uo: any) => uo.organization_id);
        const { data: orgs, error } = await supabase
            .from("organizations")
            .select("*")
            .in("id", orgIds)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);

        // Get user counts for these organizations
        const { data: userOrgs } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .in("organization_id", orgIds);

        // Get site counts for these organizations
        const { data: sites } = await supabase
            .from("sites")
            .select("organization_id")
            .in("organization_id", orgIds);

        // Count users and sites per organization
        const orgsWithCounts = orgs?.map((org: any) => ({
            ...org,
            userCount: userOrgs?.filter(
                (uo: any) => uo.organization_id === org.id,
            ).length || 0,
            siteCount: sites?.filter((s: any) => s.organization_id === org.id)
                .length || 0,
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
        // Get base URL - prioritize NEXT_PUBLIC_URL, then VERCEL_URL, then localhost
        let baseUrl = process.env.NEXT_PUBLIC_URL || process.env.APP_URL;
        if (!baseUrl && process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`;
        }
        if (!baseUrl) {
            baseUrl = "http://localhost:3000";
        }

        const { data: inviteData, error: inviteError } = await supabaseService
            .auth.admin
            .inviteUserByEmail(adminEmail, {
                redirectTo: baseUrl,
                data: {
                    role: "admin",
                },
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

// Delete an organization and all its related data (CASCADE)
export async function deleteOrganization(orgId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user is superadmin
    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can delete organizations",
        );
    }

    // Get organization name for logging
    const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();

    if (!org) {
        throw new Error("Organization not found");
    }

    // Get all sites for this organization
    const { data: sites } = await supabase
        .from("sites")
        .select("id")
        .eq("organization_id", orgId);

    const siteIds = sites?.map((s) => s.id) || [];

    // Delete all site-related data for each site
    for (const siteId of siteIds) {
        await deleteSiteData(siteId, supabase);
    }

    // Delete user_organizations relationships
    const { error: userOrgError } = await supabase
        .from("user_organizations")
        .delete()
        .eq("organization_id", orgId);

    if (userOrgError) {
        console.error("Error deleting user_organizations:", userOrgError);
    }

    // Delete all sites (this should cascade due to FK constraints but let's be explicit)
    if (siteIds.length > 0) {
        const { error: sitesError } = await supabase
            .from("sites")
            .delete()
            .in("id", siteIds);

        if (sitesError) {
            throw new Error(`Failed to delete sites: ${sitesError.message}`);
        }
    }

    // Finally, delete the organization
    const { error } = await supabase.from("organizations").delete().eq(
        "id",
        orgId,
    );
    if (error) throw new Error(error.message);

    revalidatePath("/administration/organizations");
    revalidatePath("/administration");
    return {
        success: true,
        message:
            `Organization "${org.name}" and all related data deleted successfully`,
    };
}

// Helper function to delete all data related to a site
// IMPORTANT: Order matters due to foreign key constraints!
async function deleteSiteData(siteId: string, supabase: any) {
    // Get all Kanban IDs for this site first
    const { data: kanbans } = await supabase
        .from("Kanban")
        .select("id")
        .eq("site_id", siteId);
    const kanbanIds = kanbans?.map((k: any) => k.id) || [];

    // Get all Task IDs for this site (needed for deleting related records)
    const { data: tasks } = await supabase
        .from("Task")
        .select("id")
        .eq("site_id", siteId);
    const taskIds = tasks?.map((t: any) => t.id) || [];

    // =====================================================
    // STEP 1: Delete tables that reference Task
    // =====================================================
    if (taskIds.length > 0) {
        // Delete Timetracking (references Task)
        await supabase.from("Timetracking").delete().in("task_id", taskIds);

        // Delete TaskHistory (references Task)
        await supabase.from("TaskHistory").delete().in("taskId", taskIds);

        // Delete TaskSupplier (references Task)
        await supabase.from("TaskSupplier").delete().in("taskId", taskIds);

        // Delete File (references Task)
        await supabase.from("File").delete().in("taskId", taskIds);

        // Delete Action (references Task)
        await supabase.from("Action").delete().in("taskId", taskIds);

        // Delete Errortracking (references Task)
        await supabase.from("Errortracking").delete().in("task_id", taskIds);

        // Get PackingControl IDs for these tasks
        const { data: packingControls } = await supabase
            .from("PackingControl")
            .select("id")
            .in("taskId", taskIds);
        const packingControlIds = packingControls?.map((p: any) => p.id) || [];

        // Delete PackingItem (references PackingControl)
        if (packingControlIds.length > 0) {
            await supabase
                .from("PackingItem")
                .delete()
                .in("packingControlId", packingControlIds);
        }

        // Delete PackingControl (references Task)
        await supabase.from("PackingControl").delete().in("taskId", taskIds);

        // Get QualityControl IDs for these tasks
        const { data: qualityControls } = await supabase
            .from("QualityControl")
            .select("id")
            .in("taskId", taskIds);
        const qualityControlIds = qualityControls?.map((q: any) => q.id) || [];

        // Delete Qc_item (references QualityControl)
        if (qualityControlIds.length > 0) {
            await supabase
                .from("Qc_item")
                .delete()
                .in("qualityControlId", qualityControlIds);
        }

        // Delete QualityControl (references Task)
        await supabase.from("QualityControl").delete().in("taskId", taskIds);
    }

    // =====================================================
    // STEP 2: Delete Task (references KanbanColumn, Kanban, Client, SellProduct)
    // =====================================================
    // Task has site_id, so we can delete directly
    const { error: taskDeleteError } = await supabase
        .from("Task")
        .delete()
        .eq("site_id", siteId);
    if (taskDeleteError) {
        logger.error("Error deleting Tasks by site_id:", taskDeleteError);
        // Don't throw - we have fallback mechanisms later
    }

    // =====================================================
    // STEP 3: Delete KanbanColumn (references Kanban)
    // =====================================================
    if (kanbanIds.length > 0) {
        await supabase.from("KanbanColumn").delete().in("kanbanId", kanbanIds);
    }

    // =====================================================
    // STEP 4: Delete Kanban
    // =====================================================
    if (kanbanIds.length > 0) {
        // First clear self-referencing FKs
        await supabase
            .from("Kanban")
            .update({
                target_work_kanban_id: null,
                target_invoice_kanban_id: null,
            })
            .in("id", kanbanIds);

        await supabase.from("Kanban").delete().in("id", kanbanIds);
    }

    // =====================================================
    // STEP 5: Delete kanban_categories
    // =====================================================
    await supabase.from("kanban_categories").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 6: Delete Products (first delete Action referencing products)
    // =====================================================
    const { data: products } = await supabase
        .from("Product")
        .select("id")
        .eq("site_id", siteId);
    const productIds = products?.map((p: any) => p.id) || [];

    if (productIds.length > 0) {
        await supabase.from("Action").delete().in("productId", productIds);
    }
    await supabase.from("Product").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 7: Delete product categories
    // =====================================================
    await supabase.from("ProductsCategory").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 8: Delete Suppliers (first delete references)
    // =====================================================
    const { data: suppliers } = await supabase
        .from("Supplier")
        .select("id")
        .eq("site_id", siteId);
    const supplierIds = suppliers?.map((s: any) => s.id) || [];

    if (supplierIds.length > 0) {
        // Delete TaskSupplier junction table
        const { error: taskSupplierError } = await supabase
            .from("TaskSupplier")
            .delete()
            .in("supplierId", supplierIds);
        if (taskSupplierError) {
            console.error("Error deleting TaskSupplier:", taskSupplierError);
        }

        // Delete Errortracking referencing suppliers
        const { error: errortrackingError } = await supabase
            .from("Errortracking")
            .delete()
            .in("supplier_id", supplierIds);
        if (errortrackingError) {
            logger.error("Error deleting Errortracking:", errortrackingError);
        }

        // Nullify Product.supplierId references
        const { error: productSupplierError } = await supabase
            .from("Product")
            .update({ supplierId: null })
            .in("supplierId", supplierIds);
        if (productSupplierError) {
            console.error(
                "Error nullifying Product supplierId:",
                productSupplierError,
            );
        }
    }

    const { error: supplierDeleteError } = await supabase
        .from("Supplier")
        .delete()
        .eq("site_id", siteId);
    if (supplierDeleteError) {
        logger.error("Error deleting Supplier:", supplierDeleteError);
        throw new Error(
            `Failed to delete suppliers: ${supplierDeleteError.message}`,
        );
    }

    // =====================================================
    // STEP 9: Delete Clients (first ensure no Tasks reference them)
    // =====================================================
    const { data: clients } = await supabase
        .from("Client")
        .select("id")
        .eq("site_id", siteId);
    const clientIds = clients?.map((c: any) => c.id) || [];

    if (clientIds.length > 0) {
        // IMPORTANT: Delete any remaining Tasks that reference these clients
        // (in case some Tasks don't have site_id set, or deletion in STEP 2 failed)
        const { error: taskByClientError } = await supabase
            .from("Task")
            .delete()
            .in("clientId", clientIds);
        if (taskByClientError) {
            logger.error(
                "Error deleting Tasks by clientId:",
                taskByClientError,
            );
            // Try setting clientId to null instead
            const { error: nullifyError } = await supabase
                .from("Task")
                .update({ clientId: null })
                .in("clientId", clientIds);
            if (nullifyError) {
                console.error("Error nullifying Task clientId:", nullifyError);
            }
        }

        // Delete ClientAddress
        const { error: clientAddressError } = await supabase
            .from("ClientAddress")
            .delete()
            .in("clientId", clientIds);
        if (clientAddressError) {
            logger.error("Error deleting ClientAddress:", clientAddressError);
        }

        // Delete Action referencing clients
        const { error: actionClientError } = await supabase
            .from("Action")
            .delete()
            .in("clientId", clientIds);
        if (actionClientError) {
            logger.error("Error deleting Action (client):", actionClientError);
        }
    }

    // Delete all clients for this site
    const { error: clientDeleteError } = await supabase
        .from("Client")
        .delete()
        .eq("site_id", siteId);
    if (clientDeleteError) {
        console.error("Error deleting Client:", clientDeleteError);
        throw new Error(
            `Failed to delete clients: ${clientDeleteError.message}`,
        );
    }

    // =====================================================
    // STEP 10: Delete site settings
    // =====================================================
    await supabase.from("site_settings").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 11: Delete code sequences
    // =====================================================
    await supabase.from("code_sequences").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 12: Delete SellProduct (Task already deleted by site_id in STEP 2)
    // =====================================================
    const { error: sellProductDeleteError } = await supabase
        .from("SellProduct")
        .delete()
        .eq("site_id", siteId);
    if (sellProductDeleteError) {
        logger.error("Error deleting SellProduct:", sellProductDeleteError);
    }

    // =====================================================
    // STEP 13: Delete sell product categories
    // =====================================================
    await supabase.from("sellproduct_categories").delete().eq(
        "site_id",
        siteId,
    );

    // =====================================================
    // STEP 14: Delete Roles for this site
    // =====================================================
    const { data: roles } = await supabase
        .from("Roles")
        .select("id")
        .eq("site_id", siteId);
    const roleIds = roles?.map((r: any) => r.id) || [];

    if (roleIds.length > 0) {
        // Delete _RolesToUser junction
        await supabase.from("_RolesToUser").delete().in("A", roleIds);
        // Delete _RolesToTimetracking junction
        await supabase.from("_RolesToTimetracking").delete().in("A", roleIds);
    }
    await supabase.from("Roles").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 15: Delete user_sites
    // =====================================================
    await supabase.from("user_sites").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 16: Delete site_modules
    // =====================================================
    await supabase.from("site_modules").delete().eq("site_id", siteId);

    // =====================================================
    // STEP 17: Delete supplier_categories
    // =====================================================
    await supabase.from("supplier_categories").delete().eq("site_id", siteId);
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
        logger.error("Error fetching organization users:", error);
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
        logger.error("Error fetching user profiles:", profilesError);
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
            "authId, given_name, family_name, role, enabled",
        );
        return data.users.map((user: any) => {
            const profile = profiles?.find((p: any) => p.authId === user.id);
            return {
                id: user.id,
                email: user.email,
                role: profile?.role || "user",
                given_name: profile?.given_name || "",
                family_name: profile?.family_name || "",
                enabled: profile?.enabled ?? false,
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
            "authId, given_name, family_name, role, enabled",
        );

        return orgUsers.map((user: any) => {
            const profile = profiles?.find((p: any) => p.authId === user.id);
            return {
                id: user.id,
                email: user.email,
                role: profile?.role || "user",
                given_name: profile?.given_name || "",
                family_name: profile?.family_name || "",
                enabled: profile?.enabled ?? false,
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
        "authId, given_name, family_name, role, enabled",
    );

    return data.users.map((user: any) => {
        const profile = profiles?.find((p: any) => p.authId === user.id);
        return {
            id: user.id,
            email: user.email,
            role: profile?.role || "user",
            given_name: profile?.given_name || "",
            family_name: profile?.family_name || "",
            enabled: profile?.enabled ?? false,
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

    const userOrgIds = userOrgs?.map((uo: any) => uo.organization_id) || [];

    // If user has no organizations, only superadmins can update them
    // (this allows assigning organizations to users who don't have one yet)
    if (userOrgIds.length === 0) {
        if (!userContext?.canAccessAllOrganizations) {
            throw new Error(
                "Unauthorized: Only superadmins can update users without organizations",
            );
        }
    } else {
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
    }

    // Check if user is trying to update to superadmin role without permission
    if (
        updates.role === "superadmin" && !userContext?.canAccessAllOrganizations
    ) {
        throw new Error(
            "Unauthorized: Only superadmins can assign superadmin roles",
        );
    }

    // Extract organization IDs and sites from updates if present
    const { organization, sites, ...userUpdates } = updates;

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

    // Update sites if provided
    if (sites && Array.isArray(sites)) {
        // Delete existing user-site relationships
        const { error: deleteError } = await supabase
            .from("user_sites")
            .delete()
            .eq("user_id", userId);

        if (deleteError) throw new Error(deleteError.message);

        // Insert new user-site relationships
        if (sites.length > 0) {
            const userSiteInserts = sites.map((siteId: string) => ({
                site_id: siteId,
                user_id: userId,
            }));

            const { error: insertError } = await supabase
                .from("user_sites")
                .insert(userSiteInserts);

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

// Create a new user and assign to sites
// - Regular users (role=user) are added to user_sites
// - Admin users (role=admin) are added to user_organizations (org admin)
// - Superadmin users are not added to any junction table (they see everything)
// Supports two modes:
// 1. Invitation mode (default): sends email invitation for user to set password
// 2. Password mode: creates user with password directly (user is immediately active)
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
        const role = formData.get("role") as string;
        const name = formData.get("name") as string;
        const last_name = formData.get("last_name") as string;
        
        // Check if we're creating with password or invitation
        const createWithPassword = formData.get("createWithPassword") === "true";
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Get sites for regular users, organizations for admins
        const siteIds = formData.getAll("site") as string[];
        const orgId = formData.get("organization") as string;

        // Validation based on role
        if (role === "user" && !siteIds.length) {
            return {
                success: false,
                message: "Seleziona almeno un sito per l'utente",
            };
        }

        if (role === "admin" && !orgId) {
            return {
                success: false,
                message: "Seleziona un'organizzazione per l'admin",
            };
        }

        if (!email || !role) {
            return {
                success: false,
                message: "Compila tutti i campi obbligatori",
            };
        }

        // Password validation if creating with password
        if (createWithPassword) {
            if (!password || password.length < 6) {
                return {
                    success: false,
                    message: "La password deve essere di almeno 6 caratteri",
                };
            }
            if (password !== confirmPassword) {
                return {
                    success: false,
                    message: "Le password non corrispondono",
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

        // For regular users, verify the creator has access to the sites
        if (role === "user" && !userContext.canAccessAllOrganizations) {
            // Get organization IDs for the selected sites
            const { data: sitesData } = await supabase
                .from("sites")
                .select("organization_id")
                .in("id", siteIds);

            const siteOrgIds = sitesData?.map((s) =>
                s.organization_id
            ).filter(Boolean) || [];
            const userOrgIds = userContext.organizationIds || [];
            const canCreateInAll = siteOrgIds.every((siteOrgId) =>
                userOrgIds.includes(siteOrgId)
            );
            if (!canCreateInAll) {
                return {
                    success: false,
                    message:
                        "Unauthorized: You can only create users in sites belonging to your organization",
                };
            }
        }

        // For admins, verify the creator has access to the organization
        if (role === "admin" && !userContext.canAccessAllOrganizations) {
            const userOrgIds = userContext.organizationIds || [];
            if (!userOrgIds.includes(orgId)) {
                return {
                    success: false,
                    message:
                        "Unauthorized: You can only create admins in your organization",
                };
            }
        }

        const supabaseService = await createServiceClient();

        // Get organization ID for the user based on role
        let userOrganizationId: string | null = null;
        if (role === "admin" && orgId) {
            userOrganizationId = orgId;
        } else if (role === "user" && siteIds.length > 0) {
            // Get organization ID from the first selected site
            const { data: siteData } = await supabase
                .from("sites")
                .select("organization_id")
                .eq("id", siteIds[0])
                .single();
            userOrganizationId = siteData?.organization_id || null;
        }

        // Get site/organization names for the email template
        let contextText = "";
        if (role === "user" && siteIds.length > 0) {
            const { data: sitesData } = await supabase
                .from("sites")
                .select("name")
                .in("id", siteIds);
            const siteNames = sitesData?.map((s) => s.name).filter(Boolean) ||
                [];
            contextText = siteNames.length === 1
                ? siteNames[0]
                : siteNames.join(", ");
        } else if (role === "admin" && orgId) {
            const { data: orgData } = await supabase
                .from("organizations")
                .select("name")
                .eq("id", orgId)
                .single();
            contextText = orgData?.name || "";
        }

        let userId: string;

        if (createWithPassword) {
            // Create user directly with password using admin API
            const { data: createData, error: createError } = await supabaseService
                .auth.admin
                .createUser({
                    email: email,
                    password: password,
                    email_confirm: true, // Auto-confirm email since admin is creating
                    user_metadata: {
                        name: name,
                        last_name: last_name,
                        role: role,
                        context_text: contextText,
                    },
                });

            if (createError) {
                return {
                    success: false,
                    message: "Errore nella creazione dell'utente: " + createError.message,
                };
            }

            userId = createData.user.id;
            logger.info("User created with password:", userId);

            // Insert into User table with role - user is immediately enabled
            const { error: userError } = await supabase.from("User")
                .insert({
                    authId: userId,
                    auth_id: userId,
                    email: email,
                    given_name: name,
                    family_name: last_name,
                    role: role,
                    enabled: true, // User is immediately active when created with password
                });

            if (userError) {
                return {
                    success: false,
                    message: userError.message,
                };
            }
        } else {
            // Use invitation flow - send email invitation
            // Get base URL - prioritize NEXT_PUBLIC_URL, then VERCEL_URL, then localhost
            let baseUrl = process.env.NEXT_PUBLIC_URL;
            if (!baseUrl && process.env.VERCEL_URL) {
                baseUrl = `https://${process.env.VERCEL_URL}`;
            }
            if (!baseUrl) {
                baseUrl = "http://localhost:3000";
            }

            // Redirect to the base URL - the InvitationHandler component will handle
            // reading the hash fragment and redirecting to complete-signup
            const { data: inviteData, error: inviteError } = await supabaseService
                .auth.admin
                .inviteUserByEmail(email, {
                    redirectTo: baseUrl,
                    data: {
                        name: name,
                        last_name: last_name,
                        role: role,
                        context_text: contextText,
                    },
                });

            logger.debug("invitedData", inviteData);

            if (inviteError) {
                return {
                    success: false,
                    message: "Failed to send invitation: " + inviteError.message,
                };
            }

            userId = inviteData.user.id;

            // Insert into User table with role
            const { error: userError } = await supabase.from("User")
                .insert({
                    authId: userId,
                    auth_id: userId,
                    email: email,
                    given_name: name,
                    family_name: last_name,
                    role: role,
                    enabled: false, // User starts as inactive until they confirm their email
                });

            if (userError) {
                return {
                    success: false,
                    message: userError.message,
                };
            }
        }

        // Insert into the appropriate junction table based on role
        if (role === "user") {
            // Regular users go into user_sites
            const userSiteInserts = siteIds.map((siteId) => ({
                site_id: siteId,
                user_id: userId,
            }));

            const { error: userSiteError } = await supabase.from("user_sites")
                .insert(userSiteInserts);

            if (userSiteError) {
                return {
                    success: false,
                    message: userSiteError.message,
                };
            }

            // Also add user to organization
            if (userOrganizationId) {
                const { error: userOrgError } = await supabase.from("user_organizations")
                    .insert({
                        organization_id: userOrganizationId,
                        user_id: userId,
                    });

                if (userOrgError && !userOrgError.message.includes("duplicate")) {
                    logger.warn("Could not add user to organization:", userOrgError.message);
                }
            }
        } else if (role === "admin") {
            // Admin users go into user_organizations
            const { error: userOrgError } = await supabase.from(
                "user_organizations",
            )
                .insert({
                    organization_id: orgId,
                    user_id: userId,
                });

            if (userOrgError) {
                return {
                    success: false,
                    message: userOrgError.message,
                };
            }
        }
        // Note: superadmin users don't need to be in any junction table

        revalidatePath("/administration/users");
        
        if (createWithPassword) {
            return {
                success: true,
                message: "Utente creato con successo! L'utente può accedere immediatamente con le credenziali fornite.",
            };
        } else {
            return {
                success: true,
                message: "Utente invitato con successo! Riceverà un'email per impostare la password.",
            };
        }
    } catch (error: any) {
        logger.error("Error creating user:", error);
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

// Delete a site and all its related data
export async function deleteSite(siteId: string) {
    const supabase = await createClient();
    const userContext = await getUserContext();

    // Check if user is superadmin
    if (!userContext?.canAccessAllOrganizations) {
        throw new Error(
            "Unauthorized: Only superadmins can delete sites",
        );
    }

    // Get site name for logging
    const { data: site } = await supabase
        .from("sites")
        .select("name")
        .eq("id", siteId)
        .single();

    if (!site) {
        throw new Error("Site not found");
    }

    // Delete all site-related data
    await deleteSiteData(siteId, supabase);

    // Delete the site itself
    const { error: deleteSiteError } = await supabase
        .from("sites")
        .delete()
        .eq("id", siteId);

    if (deleteSiteError) {
        throw new Error(`Failed to delete site: ${deleteSiteError.message}`);
    }

    revalidatePath("/administration/sites");
    revalidatePath("/administration");
    return {
        success: true,
        message:
            `Site "${site.name}" and all related data deleted successfully`,
    };
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
