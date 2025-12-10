import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";
import { cache } from "react";

const log = logger.scope("ServerData");

/**
 * Server-side data fetching utilities for multi-tenant pages
 *
 * USE THIS FOR:
 * - Initial page load (Server Components)
 * - Static data that doesn't change often
 * - SEO-critical content
 *
 * USE REACT QUERY FOR:
 * - Real-time updates (polling)
 * - User interactions that require refetch
 * - Optimistic updates
 */

// ============================================
// SITE CONTEXT
// ============================================

export interface ServerSiteContext {
    siteId: string;
    organizationId: string | null;
    siteData: any;
}

/**
 * Get site context for server-side rendering
 * Cached per request using React cache()
 */
export const getServerSiteContext = cache(
    async (domain: string): Promise<ServerSiteContext | null> => {
        if (!domain) return null;

        try {
            const siteResult = await getSiteData(domain);
            if (siteResult?.data) {
                return {
                    siteId: siteResult.data.id,
                    organizationId: siteResult.data.organization_id,
                    siteData: siteResult.data,
                };
            }
        } catch (error) {
            log.error("Error getting site context:", error);
        }

        return null;
    },
);

/**
 * Get site context or throw error (for required multi-tenant pages)
 */
export async function requireServerSiteContext(
    domain: string,
): Promise<ServerSiteContext> {
    const context = await getServerSiteContext(domain);
    if (!context) {
        throw new Error(`Site not found for domain: ${domain}`);
    }
    return context;
}

// ============================================
// ENTITY FETCHERS (cached per request)
// ============================================

/**
 * Fetch clients for a site with last modification info
 */
export const fetchClients = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Fetch clients
    const { data: clients, error } = await supabase
        .from("Client")
        .select("*")
        .eq("site_id", siteId)
        .order("businessName", { ascending: true });

    if (error) {
        log.error("Error fetching clients:", error);
        return [];
    }

    if (!clients || clients.length === 0) {
        return [];
    }

    // Fetch all client-related actions with user info
    const clientIds = clients.map((c) => c.id);
    const { data: actions, error: actionsError } = await supabase
        .from("Action")
        .select(`
            *,
            User:user_id (id, given_name, family_name, picture, initials)
        `)
        .in("clientId", clientIds)
        .order("createdAt", { ascending: false });

    if (actionsError) {
        log.warn("Error fetching client actions:", actionsError);
        // Return clients without actions if error
        return clients.map((c) => ({ ...c, lastAction: null }));
    }

    // Group actions by clientId and get the most recent one
    const actionsByClient = new Map<number, any>();
    (actions || []).forEach((action) => {
        if (action.clientId && !actionsByClient.has(action.clientId)) {
            actionsByClient.set(action.clientId, action);
        }
    });

    // Merge clients with their last action
    return clients.map((client) => ({
        ...client,
        lastAction: actionsByClient.get(client.id) || null,
    }));
});

/**
 * Fetch suppliers for a site with last modification info
 */
export const fetchSuppliers = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Fetch suppliers
    const { data: suppliers, error } = await supabase
        .from("Supplier")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching suppliers:", error);
        return [];
    }

    if (!suppliers || suppliers.length === 0) {
        return [];
    }

    // Fetch all supplier-related actions with user info
    const supplierIds = suppliers.map((s) => s.id);
    const { data: actions, error: actionsError } = await supabase
        .from("Action")
        .select(`
            *,
            User:user_id (id, given_name, family_name, picture, initials)
        `)
        .in("supplierId", supplierIds)
        .order("createdAt", { ascending: false });

    if (actionsError) {
        log.warn("Error fetching supplier actions:", actionsError);
        return suppliers.map((s) => ({ ...s, lastAction: null }));
    }

    // Group actions by supplierId and get the most recent one
    const actionsBySupplier = new Map<number, any>();
    (actions || []).forEach((action) => {
        if (action.supplierId && !actionsBySupplier.has(action.supplierId)) {
            actionsBySupplier.set(action.supplierId, action);
        }
    });

    // Merge suppliers with their last action
    return suppliers.map((supplier) => ({
        ...supplier,
        lastAction: actionsBySupplier.get(supplier.id) || null,
    }));
});

/**
 * Fetch categories for a site
 */
export const fetchCategories = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("Product_category")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching categories:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch sell products for a site
 */
export const fetchSellProducts = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data: products, error } = await supabase
        .from("SellProduct")
        .select("*, category:category_id(id, name, color)")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching sell products:", error);
        return [];
    }

    if (!products || products.length === 0) {
        return [];
    }

    // Fetch product-related actions with user info
    const productIds = products.map((p) => p.id);
    const { data: actions, error: actionsError } = await supabase
        .from("Action")
        .select(`
            *,
            User:user_id (id, given_name, family_name, picture, initials)
        `)
        .or(`data->sellProductId.in.(${
            productIds.join(",")
        }),data->>sellProductId.in.(${productIds.join(",")})`)
        .order("createdAt", { ascending: false });

    if (!actionsError && actions) {
        // Group actions by sellProductId and get the most recent one
        const actionsByProduct = new Map<number, any>();
        actions.forEach((action) => {
            const sellProductId = action.data?.sellProductId;
            if (sellProductId && !actionsByProduct.has(sellProductId)) {
                actionsByProduct.set(sellProductId, action);
            }
        });

        // Merge products with their last action
        return products.map((product) => ({
            ...product,
            lastAction: actionsByProduct.get(product.id) || null,
        }));
    }

    return products.map((p) => ({ ...p, lastAction: null }));
});

/**
 * Fetch kanbans for a site
 */
export const fetchKanbans = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("Kanban")
        .select("*")
        .eq("site_id", siteId);

    if (error) {
        log.error("Error fetching kanbans:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch inventory products for a site
 */
export const fetchInventory = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("Product")
        .select("*")
        .eq("site_id", siteId);

    if (error) {
        log.error("Error fetching inventory:", error);
        return [];
    }
    return data || [];
});

// ============================================
// COMPLEX DATA FETCHERS
// ============================================

/**
 * Fetch kanban with full data (tasks, columns, etc.)
 * Optimized with parallel queries
 */
export const fetchKanbanWithTasks = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Phase 1: Fetch kanbans and tasks in parallel
    const [kanbansResult, tasksResult, clientsResult, productsResult] =
        await Promise.all([
            supabase.from("Kanban").select("*").eq("site_id", siteId),
            supabase
                .from("Task")
                .select("*")
                .eq("site_id", siteId)
                .eq("archived", false),
            supabase.from("Client").select("*").eq("site_id", siteId),
            supabase.from("SellProduct").select("*").eq("site_id", siteId),
        ]);

    const kanbans = kanbansResult.data || [];
    const tasks = tasksResult.data || [];
    const clients = clientsResult.data || [];
    const products = productsResult.data || [];

    if (tasks.length === 0) {
        return { kanbans, tasks: [], clients, products };
    }

    // Phase 2: Fetch related data
    const kanbanIds = kanbans.map((k) => k.id);
    const taskIds = tasks.map((t) => t.id);

    const [columnsResult, filesResult, qcResult, packingResult, historyResult] =
        await Promise.all([
            kanbanIds.length > 0
                ? supabase
                    .from("KanbanColumn")
                    .select("*")
                    .in("kanbanId", kanbanIds)
                : Promise.resolve({ data: [] }),
            supabase.from("File").select("*").in("taskId", taskIds),
            supabase.from("QualityControl").select("*").in("taskId", taskIds),
            supabase.from("PackingControl").select("*").in("taskId", taskIds),
            supabase.from("Action").select("*").eq("site_id", siteId),
        ]);

    const columns = columnsResult.data || [];
    const files = filesResult.data || [];
    const qc = qcResult.data || [];
    const packing = packingResult.data || [];
    const history = historyResult.data || [];

    // Create lookup maps for O(1) access
    const columnMap = new Map(columns.map((c) => [c.id, c]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const kanbanMap = new Map(kanbans.map((k) => [k.id, k]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Group related data by taskId
    const filesByTask = new Map<number, typeof files>();
    files.forEach((f) => {
        const arr = filesByTask.get(f.taskId) || [];
        arr.push(f);
        filesByTask.set(f.taskId, arr);
    });

    const qcByTask = new Map<number, typeof qc>();
    qc.forEach((item) => {
        const arr = qcByTask.get(item.taskId) || [];
        arr.push(item);
        qcByTask.set(item.taskId, arr);
    });

    const packingByTask = new Map<number, typeof packing>();
    packing.forEach((item) => {
        const arr = packingByTask.get(item.taskId) || [];
        arr.push(item);
        packingByTask.set(item.taskId, arr);
    });

    // Build tasks with relations
    const tasksWithRelations = tasks.map((task) => ({
        ...task,
        column: columnMap.get(task.kanbanColumnId),
        client: clientMap.get(task.clientId),
        kanban: kanbanMap.get(task.kanbanId),
        sellProduct: productMap.get(task.sellProductId),
        files: filesByTask.get(task.id) || [],
        QualityControl: qcByTask.get(task.id) || [],
        PackingControl: packingByTask.get(task.id) || [],
    }));

    return {
        kanbans,
        tasks: tasksWithRelations,
        clients,
        products,
        history,
    };
});

/**
 * Fetch a single kanban with columns
 */
export const fetchSingleKanban = cache(
    async (siteId: string, identifier: string) => {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("Kanban")
            .select(
                `
            *,
            columns:KanbanColumn(*),
            category:KanbanCategory(*)
        `,
            )
            .eq("site_id", siteId)
            .eq("identifier", identifier)
            .order("position", { referencedTable: "KanbanColumn" })
            .single();

        if (error) {
            log.warn("Kanban not found:", identifier);
            return null;
        }

        return data;
    },
);

/**
 * Fetch tasks for a site (without relations)
 */
export const fetchTasks = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("Task")
        .select("*")
        .eq("site_id", siteId)
        .eq("archived", false)
        .order("unique_code", { ascending: true });

    if (error) {
        log.error("Error fetching tasks:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch tasks with full relations for projects page
 */
export const fetchTasksWithRelations = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("Task")
        .select(`
            *,
            Kanban!kanbanId (id, title),
            KanbanColumn!kanbanColumnId (id, title),
            Client!clientId (businessName, individualFirstName, individualLastName),
            SellProduct!sellProductId (name),
            Action (id, createdAt, User (picture, authId, given_name))
        `)
        .eq("site_id", siteId);

    if (error) {
        log.error("Error fetching tasks with relations:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch users for a site
 */
export const fetchUsers = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Get user IDs from user_sites
    const { data: userSites, error: userSitesError } = await supabase
        .from("user_sites")
        .select("user_id")
        .eq("site_id", siteId);

    if (userSitesError || !userSites?.length) {
        return [];
    }

    const userIds = userSites.map((us) => us.user_id);

    const { data: users, error } = await supabase
        .from("User")
        .select("*")
        .eq("enabled", true)
        .in("authId", userIds)
        .order("family_name", { ascending: true });

    if (error) {
        log.error("Error fetching users:", error);
        return [];
    }
    return users || [];
});

/**
 * Fetch roles for a site
 */
export const fetchRoles = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Get both site-specific and global roles
    const [siteRolesResult, globalRolesResult] = await Promise.all([
        supabase.from("Roles").select("*").eq("site_id", siteId),
        supabase.from("Roles").select("*").is("site_id", null),
    ]);

    const siteRoles = siteRolesResult.data || [];
    const globalRoles = globalRolesResult.data || [];

    // Combine and deduplicate
    const allRoles = [...siteRoles, ...globalRoles];
    return allRoles.filter(
        (role, index, self) =>
            index === self.findIndex((r) => r.id === role.id),
    );
});

/**
 * Fetch timetracking data with relations
 */
export const fetchTimetracking = cache(async (siteId: string) => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("Timetracking")
        .select(`
            *,
            task:task_id(*, site_id),
            user:employee_id(id, given_name, family_name, email),
            roles:_RolesToTimetracking(role:Roles(id, name))
        `)
        .order("created_at", { ascending: false });

    if (error) {
        log.error("Error fetching timetracking:", error);
        return [];
    }

    // Filter by site_id through task relation
    return (data || []).filter((t) => t.task?.site_id === siteId);
});

/**
 * Fetch quality control data
 */
export const fetchQualityControl = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("QualityControl")
        .select("*")
        .eq("site_id", siteId);

    if (error) {
        log.error("Error fetching quality control:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch error tracking data
 */
export const fetchErrorTracking = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("errortracking")
        .select("*")
        .eq("site_id", siteId);

    if (error) {
        log.error("Error fetching error tracking:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch data for reports page
 */
export const fetchReportsData = cache(async (siteId: string) => {
    const supabase = await createClient();

    const [suppliersResult, qcResult, packingResult, tasksResult] =
        await Promise.all([
            supabase.from("Supplier").select("*").eq("site_id", siteId),
            supabase.from("QualityControl").select("*").eq("site_id", siteId),
            supabase.from("PackingControl").select("*").eq("site_id", siteId),
            supabase
                .from("Task")
                .select("*, column:kanbanColumnId(*)")
                .eq("site_id", siteId)
                .eq("archived", false),
        ]);

    return {
        suppliers: suppliersResult.data || [],
        qualityControl: qcResult.data || [],
        packingControl: packingResult.data || [],
        tasks: tasksResult.data || [],
    };
});

/**
 * Fetch data for inventory page with last modification info
 */
export const fetchInventoryData = cache(async (siteId: string) => {
    const supabase = await createClient();

    const [inventoryResult, categoriesResult, suppliersResult] = await Promise
        .all([
            supabase.from("Product").select("*").eq("site_id", siteId),
            supabase
                .from("Product_category")
                .select("*")
                .eq("site_id", siteId)
                .order("name", { ascending: true }),
            supabase
                .from("Supplier")
                .select("*")
                .eq("site_id", siteId)
                .order("name", { ascending: true }),
        ]);

    const inventory = inventoryResult.data || [];

    // Fetch product-related actions with user info
    if (inventory.length > 0) {
        const productIds = inventory.map((p) => p.id);
        const { data: actions, error: actionsError } = await supabase
            .from("Action")
            .select(`
                *,
                User:user_id (id, given_name, family_name, picture, initials)
            `)
            .in("productId", productIds)
            .order("createdAt", { ascending: false });

        if (!actionsError && actions) {
            // Group actions by productId and get the most recent one
            const actionsByProduct = new Map<number, any>();
            actions.forEach((action) => {
                if (
                    action.productId && !actionsByProduct.has(action.productId)
                ) {
                    actionsByProduct.set(action.productId, action);
                }
            });

            // Merge products with their last action
            const inventoryWithActions = inventory.map((product) => ({
                ...product,
                lastAction: actionsByProduct.get(product.id) || null,
            }));

            return {
                inventory: inventoryWithActions,
                categories: categoriesResult.data || [],
                suppliers: suppliersResult.data || [],
            };
        }
    }

    return {
        inventory: inventory.map((p) => ({ ...p, lastAction: null })),
        categories: categoriesResult.data || [],
        suppliers: suppliersResult.data || [],
    };
});

/**
 * Fetch data for timetracking page
 */
export const fetchTimetrackingData = cache(async (siteId: string) => {
    const [timetrackings, tasks, users, roles] = await Promise.all([
        fetchTimetracking(siteId),
        fetchTasks(siteId),
        fetchUsers(siteId),
        fetchRoles(siteId),
    ]);

    return { timetrackings, tasks, users, roles };
});

/**
 * Fetch data for projects page
 */
export const fetchProjectsData = cache(async (siteId: string) => {
    const [clients, products, kanbans, tasks] = await Promise.all([
        fetchClients(siteId),
        fetchSellProducts(siteId),
        fetchKanbans(siteId),
        fetchTasksWithRelations(siteId),
    ]);

    return { clients, activeProducts: products, kanbans, tasks };
});

/**
 * Fetch collaborators for a site
 * Returns:
 * - Users directly assigned to this site (from user_sites)
 * - The admin(s) of the organization that owns this site (from user_organizations with role=admin)
 * Excludes global superadmins
 */
export const fetchCollaborators = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Step 1: Get the site's organization_id
    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("organization_id")
        .eq("id", siteId)
        .single();

    if (siteError) {
        log.error("Error fetching site:", siteError.message);
        return [];
    }

    // Step 2: Get user IDs from user_sites for this specific site (direct site users)
    const { data: userSites, error: userSitesError } = await supabase
        .from("user_sites")
        .select("user_id, created_at")
        .eq("site_id", siteId);

    if (userSitesError) {
        log.error("Error fetching user_sites:", userSitesError.message);
    }

    // Step 3: Get organization admin(s) from user_organizations
    // These are users with role="admin" in the User table who are linked to this organization
    let orgAdminUserIds: { user_id: string; created_at: string }[] = [];
    if (site?.organization_id) {
        const { data: orgUsersData, error: orgUsersError } = await supabase
            .from("user_organizations")
            .select("user_id, created_at")
            .eq("organization_id", site.organization_id);

        if (orgUsersError) {
            log.error(
                "Error fetching user_organizations:",
                orgUsersError.message,
            );
        } else {
            orgAdminUserIds = orgUsersData || [];
        }
    }

    // Combine user IDs from both sources (deduplicated)
    const siteUserIds = userSites?.map((us) => us.user_id) || [];
    const orgUserIds = orgAdminUserIds.map((ou) => ou.user_id);
    const allUserIds = Array.from(new Set([...siteUserIds, ...orgUserIds]));

    if (!allUserIds.length) {
        log.warn("No users found for site:", siteId);
        return [];
    }

    // Create a map for joined_at dates (prefer site-level date)
    const userJoinDates = new Map<string, string>();
    orgAdminUserIds.forEach((ou) =>
        userJoinDates.set(ou.user_id, ou.created_at)
    );
    userSites?.forEach((us) => userJoinDates.set(us.user_id, us.created_at)); // Site dates override org dates

    // Track which users are org admins vs site users
    const orgAdminSet = new Set(orgUserIds);
    const siteUserSet = new Set(siteUserIds);

    log.info(
        "Found user_ids - site users:",
        siteUserIds.length,
        "org admins:",
        orgUserIds.length,
    );

    // Step 4: Get user details from User table
    const { data: users, error: usersError } = await supabase
        .from("User")
        .select("*")
        .in("authId", allUserIds);

    log.info("Query with authId - users found:", users?.length || 0);

    if (usersError) {
        log.error("Error fetching users with authId:", usersError.message);
    }

    if (!users?.length) {
        // Try with auth_id field as fallback
        log.info("Trying fallback with auth_id field...");
        const { data: usersAlt, error: usersAltError } = await supabase
            .from("User")
            .select("*")
            .in("auth_id", allUserIds);

        log.info("Query with auth_id - users found:", usersAlt?.length || 0);

        if (usersAltError) {
            log.error(
                "Error fetching users with auth_id:",
                usersAltError.message,
            );
        }

        if (!usersAlt?.length) {
            log.warn("No users found in User table for the given user_ids");
            return [];
        }

        // Process with auth_id field
        const filteredUsersAlt = usersAlt
            .filter((user) => {
                // Exclude superadmins and disabled users
                if (user.role === "superadmin" || !user.enabled) return false;

                const userId = user.auth_id || "";
                // Include if: user is a site user OR user is an org admin
                return siteUserSet.has(userId) ||
                    (orgAdminSet.has(userId) && user.role === "admin");
            });

        // Get User IDs (internal IDs) for role lookup
        const userDbIdsAlt = filteredUsersAlt.map((user) => user.id);

        // Fetch user roles from _RolesToUser junction table
        const { data: userRoleLinksAlt, error: rolesLinkErrorAlt } =
            await supabase
                .from("_RolesToUser")
                .select("A, B")
                .in("B", userDbIdsAlt);

        if (rolesLinkErrorAlt) {
            log.error(
                "Error fetching user role links (alt):",
                rolesLinkErrorAlt.message,
            );
        }

        // Get all role IDs and fetch role details
        const roleIdsAlt = Array.from(
            new Set(userRoleLinksAlt?.map((link: any) => link.A) || []),
        );
        let rolesMapAlt = new Map<
            number,
            { id: number; name: string; site_id: string | null }
        >();

        if (roleIdsAlt.length > 0) {
            const { data: rolesAlt, error: rolesErrorAlt } = await supabase
                .from("Roles")
                .select("id, name, site_id")
                .in("id", roleIdsAlt)
                .or(`site_id.eq.${siteId},site_id.is.null`);

            if (rolesErrorAlt) {
                log.error("Error fetching roles (alt):", rolesErrorAlt.message);
            } else if (rolesAlt) {
                rolesAlt.forEach((role: any) => rolesMapAlt.set(role.id, role));
            }
        }

        // Create a map of user DB ID -> assigned roles
        const userRolesMapAlt = new Map<
            number,
            Array<{ id: number; name: string; site_id: string | null }>
        >();
        userRoleLinksAlt?.forEach((link: any) => {
            const role = rolesMapAlt.get(link.A);
            if (role) {
                const existingRoles = userRolesMapAlt.get(link.B) || [];
                existingRoles.push(role);
                userRolesMapAlt.set(link.B, existingRoles);
            }
        });

        const collaborators = filteredUsersAlt
            .map((user) => {
                const userId = user.auth_id || "";
                const isOrgAdmin = orgAdminSet.has(userId) &&
                    user.role === "admin";
                const assignedRoles = userRolesMapAlt.get(user.id) || [];
                return {
                    ...user,
                    site_role: isOrgAdmin ? "org_admin" : user.role,
                    is_org_admin: isOrgAdmin,
                    joined_site_at: userJoinDates.get(userId) || null,
                    assigned_roles: assignedRoles,
                };
            })
            .sort((a, b) => {
                // Sort org admins first, then by family name
                if (a.is_org_admin && !b.is_org_admin) return -1;
                if (!a.is_org_admin && b.is_org_admin) return 1;
                const nameA = a.family_name || "";
                const nameB = b.family_name || "";
                return nameA.localeCompare(nameB);
            });

        log.info("Collaborators after filter (auth_id):", collaborators.length);
        return collaborators;
    }

    // Process with authId field
    const filteredUsers = users
        .filter((user) => {
            // Exclude superadmins and disabled users
            if (user.role === "superadmin" || !user.enabled) return false;

            const userId = user.authId || "";
            // Include if: user is a site user OR user is an org admin
            return siteUserSet.has(userId) ||
                (orgAdminSet.has(userId) && user.role === "admin");
        });

    // Get User IDs (internal IDs) for role lookup
    const userDbIds = filteredUsers.map((user) => user.id);

    // Fetch user roles from _RolesToUser junction table
    const { data: userRoleLinks, error: rolesLinkError } = await supabase
        .from("_RolesToUser")
        .select("A, B")
        .in("B", userDbIds);

    if (rolesLinkError) {
        log.error("Error fetching user role links:", rolesLinkError.message);
    }

    // Get all role IDs and fetch role details
    const roleIds = Array.from(
        new Set(userRoleLinks?.map((link: any) => link.A) || []),
    );
    let rolesMap = new Map<
        number,
        { id: number; name: string; site_id: string | null }
    >();

    if (roleIds.length > 0) {
        const { data: roles, error: rolesError } = await supabase
            .from("Roles")
            .select("id, name, site_id")
            .in("id", roleIds)
            .or(`site_id.eq.${siteId},site_id.is.null`);

        if (rolesError) {
            log.error("Error fetching roles:", rolesError.message);
        } else if (roles) {
            roles.forEach((role: any) => rolesMap.set(role.id, role));
        }
    }

    // Create a map of user DB ID -> assigned roles
    const userRolesMap = new Map<
        number,
        Array<{ id: number; name: string; site_id: string | null }>
    >();
    userRoleLinks?.forEach((link: any) => {
        const role = rolesMap.get(link.A);
        if (role) {
            const existingRoles = userRolesMap.get(link.B) || [];
            existingRoles.push(role);
            userRolesMap.set(link.B, existingRoles);
        }
    });

    const collaborators = filteredUsers
        .map((user) => {
            const userId = user.authId || "";
            const isOrgAdmin = orgAdminSet.has(userId) && user.role === "admin";
            const assignedRoles = userRolesMap.get(user.id) || [];
            return {
                ...user,
                site_role: isOrgAdmin ? "org_admin" : user.role,
                is_org_admin: isOrgAdmin,
                joined_site_at: userJoinDates.get(userId) || null,
                assigned_roles: assignedRoles,
            };
        })
        .sort((a, b) => {
            // Sort org admins first, then by family name
            if (a.is_org_admin && !b.is_org_admin) return -1;
            if (!a.is_org_admin && b.is_org_admin) return 1;
            const nameA = a.family_name || "";
            const nameB = b.family_name || "";
            return nameA.localeCompare(nameB);
        });

    log.info("Collaborators after filter (authId):", collaborators.length);
    return collaborators;
});
