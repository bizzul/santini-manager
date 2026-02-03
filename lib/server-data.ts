import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";
import { cache } from "react";
import { AVAILABLE_MODULES, ModuleConfig } from "@/lib/module-config";

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

    // Fetch all client-related actions with user info (limited for performance)
    const clientIds = clients.map((c) => c.id);
    const { data: actions, error: actionsError } = await supabase
        .from("Action")
        .select(`
            id, createdAt, clientId,
            User:user_id (id, given_name, family_name, picture, initials)
        `)
        .in("clientId", clientIds)
        .order("createdAt", { ascending: false })
        .limit(500);

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
    const supabase = createServiceClient();

    // Fetch suppliers with category relation
    const { data: suppliers, error } = await supabase
        .from("Supplier")
        .select("*, supplier_category:supplier_category_id(id, name, code)")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching suppliers:", error);
        return [];
    }

    if (!suppliers || suppliers.length === 0) {
        return [];
    }

    // Fetch all supplier-related actions with user info (limited for performance)
    const supplierIds = suppliers.map((s) => s.id);
    const { data: actions, error: actionsError } = await supabase
        .from("Action")
        .select(`
            id, createdAt, supplierId,
            User:user_id (id, given_name, family_name, picture, initials)
        `)
        .in("supplierId", supplierIds)
        .order("createdAt", { ascending: false })
        .limit(500);

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
 * Fetch supplier categories for a site
 */
export const fetchSupplierCategories = cache(async (siteId: string) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("Supplier_category")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching supplier categories:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch manufacturers for a site with last modification info
 */
export const fetchManufacturers = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Fetch manufacturers with category relation
    const { data: manufacturers, error } = await supabase
        .from("Manufacturer")
        .select(
            "*, manufacturer_category:manufacturer_category_id(id, name, code)",
        )
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching manufacturers:", error);
        return [];
    }

    if (!manufacturers || manufacturers.length === 0) {
        return [];
    }

    return manufacturers;
});

/**
 * Fetch manufacturer categories for a site
 */
export const fetchManufacturerCategories = cache(async (siteId: string) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("Manufacturer_category")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching manufacturer categories:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch sell product categories for a site
 */
export const fetchSellProductCategories = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("sellproduct_categories")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching sell product categories:", error);
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
        .eq("site_id", siteId);

    if (error) {
        log.error("Error fetching sell products:", error);
        return [];
    }

    if (!products || products.length === 0) {
        return [];
    }

    // Sort by category name (alphabetically), then by product name
    const sortedProducts = [...products].sort((a, b) => {
        const catA = a.category?.name?.toLowerCase() || "";
        const catB = b.category?.name?.toLowerCase() || "";
        if (catA !== catB) {
            return catA.localeCompare(catB, "it");
        }
        // Secondary sort by product name
        const nameA = a.name?.toLowerCase() || "";
        const nameB = b.name?.toLowerCase() || "";
        return nameA.localeCompare(nameB, "it");
    });

    // Fetch product-related actions with user info (limited for performance)
    const productIds = sortedProducts.map((p) => p.id);
    const { data: actions, error: actionsError } = await supabase
        .from("Action")
        .select(`
            id, createdAt, data,
            User:user_id (id, given_name, family_name, picture, initials)
        `)
        .or(`data->sellProductId.in.(${
            productIds.join(",")
        }),data->>sellProductId.in.(${productIds.join(",")})`)
        .order("createdAt", { ascending: false })
        .limit(500);

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
        return sortedProducts.map((product) => ({
            ...product,
            lastAction: actionsByProduct.get(product.id) || null,
        }));
    }

    return sortedProducts.map((p) => ({ ...p, lastAction: null }));
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
 * Fetch inventory products for a site (legacy - uses old Product table)
 * @deprecated Use fetchInventoryItems instead
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

/**
 * Fetch inventory items with variants and stock from new unified system
 */
export const fetchInventoryItems = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Fetch items with variants
    const { data: items, error: itemsError } = await supabase
        .from("inventory_items")
        .select(`
            *,
            category:inventory_categories(*),
            supplier:inventory_suppliers(*),
            variants:inventory_item_variants(
                *,
                unit:inventory_units(*)
            )
        `)
        .eq("site_id", siteId)
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (itemsError) {
        log.error("Error fetching inventory items:", itemsError);
        return [];
    }

    // Fetch stock quantities
    const { data: stock, error: stockError } = await supabase
        .from("inventory_stock")
        .select("*")
        .eq("site_id", siteId);

    if (stockError) {
        log.error("Error fetching inventory stock:", stockError);
    }

    // Create stock lookup map
    const stockMap = new Map<string, number>();
    (stock || []).forEach((s: any) => {
        const key = `${s.variant_id}-${s.warehouse_id || "default"}`;
        stockMap.set(key, (stockMap.get(key) || 0) + (s.quantity || 0));
    });

    // Merge stock quantities into variants
    const itemsWithStock = (items || []).map((item: any) => ({
        ...item,
        variants: (item.variants || []).map((variant: any) => ({
            ...variant,
            stock_quantity: stockMap.get(`${variant.id}-default`) || 0,
        })),
    }));

    return itemsWithStock;
});

/**
 * Fetch inventory categories for a site
 */
export const fetchInventoryCategories = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching inventory categories:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch inventory suppliers for a site
 */
export const fetchInventorySuppliers = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory_suppliers")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching inventory suppliers:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch inventory units (global)
 */
export const fetchInventoryUnits = cache(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory_units")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching inventory units:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch inventory warehouses for a site
 */
export const fetchInventoryWarehouses = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("inventory_warehouses")
        .select("*")
        .eq("site_id", siteId)
        .order("name", { ascending: true });

    if (error) {
        log.error("Error fetching inventory warehouses:", error);
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
    const [
        kanbansResult,
        tasksResult,
        clientsResult,
        productsResult,
        categoriesResult,
    ] = await Promise.all([
        supabase.from("Kanban").select("*").eq("site_id", siteId),
        supabase
            .from("Task")
            .select("*")
            .eq("site_id", siteId)
            .eq("archived", false),
        supabase.from("Client").select("*").eq("site_id", siteId),
        supabase.from("SellProduct").select(
            "*, category:sellproduct_categories(*)",
        ).eq("site_id", siteId).eq("active", true),
        supabase.from("sellproduct_categories").select("*").eq(
            "site_id",
            siteId,
        ).order("name", { ascending: true }),
    ]);

    const kanbans = kanbansResult.data || [];
    const tasks = tasksResult.data || [];
    const clients = clientsResult.data || [];
    const products = productsResult.data || [];
    const categories = categoriesResult.data || [];

    if (tasks.length === 0) {
        return { kanbans, tasks: [], clients, products, categories };
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
            supabase.from("Action").select(
                "*, User(id, picture, given_name, family_name)",
            ).eq("site_id", siteId),
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
        categories,
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
 * Fetch tasks for a site (with client relation for display)
 */
export const fetchTasks = cache(async (siteId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("Task")
        .select(
            "*, Client(businessName, individualFirstName, individualLastName)",
        )
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
            Client!clientId (businessName, individualFirstName, individualLastName, zipCode, address, city),
            SellProduct!sellProductId (name, type, category_id, category:sellproduct_categories(id, name, color)),
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
 * Fetch users for a site (includes site users and organization admins)
 */
export const fetchUsers = cache(async (siteId: string) => {
    const supabase = await createClient();

    // Step 1: Get the site's organization_id
    const { data: site, error: siteError } = await supabase
        .from("sites")
        .select("organization_id")
        .eq("id", siteId)
        .single();

    if (siteError) {
        log.error("Error fetching site for users:", siteError.message);
    }

    // Step 2: Get user IDs from user_sites (direct site users)
    const { data: userSites, error: userSitesError } = await supabase
        .from("user_sites")
        .select("user_id")
        .eq("site_id", siteId);

    if (userSitesError) {
        log.error("Error fetching user_sites:", userSitesError.message);
    }

    // Step 3: Get organization admin user IDs from user_organizations
    let orgAdminUserIds: string[] = [];
    if (site?.organization_id) {
        const { data: orgUsers, error: orgUsersError } = await supabase
            .from("user_organizations")
            .select("user_id")
            .eq("organization_id", site.organization_id);

        if (orgUsersError) {
            log.error(
                "Error fetching user_organizations:",
                orgUsersError.message,
            );
        } else {
            orgAdminUserIds = orgUsers?.map((ou) => ou.user_id) || [];
        }
    }

    // Combine user IDs from both sources (deduplicated)
    const siteUserIds = userSites?.map((us) => us.user_id) || [];
    const allUserIds = Array.from(
        new Set([...siteUserIds, ...orgAdminUserIds]),
    );

    if (!allUserIds.length) {
        return [];
    }

    // Step 4: Get user details from User table
    const { data: users, error } = await supabase
        .from("User")
        .select("*")
        .eq("enabled", true)
        .in("authId", allUserIds)
        .order("family_name", { ascending: true });

    if (error) {
        log.error("Error fetching users:", error);
        return [];
    }

    // Filter out superadmins but include admins
    return (users || []).filter((user) => user.role !== "superadmin");
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
 * Filters at database level for both direct site_id (internal activities)
 * and task.site_id (project-related entries)
 */
export const fetchTimetracking = cache(async (siteId: string) => {
    const supabase = await createClient();

    // First, get task IDs for this site to include timetracking entries linked to them
    const { data: siteTasks, error: tasksError } = await supabase
        .from("Task")
        .select("id")
        .eq("site_id", siteId);

    if (tasksError) {
        log.error("Error fetching site tasks for timetracking:", tasksError);
    }

    const siteTaskIds = (siteTasks || []).map((t) => t.id);

    // Build query with proper site filtering
    // Include client info via task for project name display
    let query = supabase
        .from("Timetracking")
        .select(`
            *,
            task:task_id(*, site_id, Client:clientId(businessName, individualFirstName, individualLastName)),
            user:employee_id(id, given_name, family_name, email),
            roles:_RolesToTimetracking(role:Roles(id, name))
        `)
        .order("created_at", { ascending: false });

    // Filter: either direct site_id match OR task is from this site
    if (siteTaskIds.length > 0) {
        query = query.or(
            `site_id.eq.${siteId},task_id.in.(${siteTaskIds.join(",")})`,
        );
    } else {
        // If no tasks, only filter by direct site_id
        query = query.eq("site_id", siteId);
    }

    const { data, error } = await query;

    if (error) {
        log.error("Error fetching timetracking:", error);
        return [];
    }

    return data || [];
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
 * Fetch error tracking data with task and user relations
 */
export const fetchErrorTracking = cache(async (siteId: string) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("Errortracking")
        .select(`
            *,
            task:task_id(unique_code, title, Client:clientId(businessName, individualFirstName, individualLastName)),
            user:user_id(id, given_name, family_name),
            supplier:supplier_id(name)
        `)
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

    if (error) {
        log.error("Error fetching error tracking:", error);
        return [];
    }
    return data || [];
});

/**
 * Fetch data for reports page
 * Includes task relations with client info for project name display
 */
export const fetchReportsData = cache(async (siteId: string) => {
    const supabase = await createClient();

    const [suppliersResult, qcResult, packingResult, tasksResult] =
        await Promise.all([
            supabase.from("Supplier").select("*").eq("site_id", siteId),
            supabase
                .from("QualityControl")
                .select(`
                    *,
                    task:taskId(unique_code, title, Client:clientId(businessName, individualFirstName, individualLastName)),
                    user:userId(id, given_name, family_name)
                `)
                .eq("site_id", siteId),
            supabase
                .from("PackingControl")
                .select(`
                    *,
                    task:taskId(unique_code, title, Client:clientId(businessName, individualFirstName, individualLastName)),
                    user:userId(id, given_name, family_name)
                `)
                .eq("site_id", siteId),
            supabase
                .from("Task")
                .select(
                    "*, column:kanbanColumnId(*), Client:clientId(businessName, individualFirstName, individualLastName)",
                )
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
 * Fetch enabled modules for a site
 */
export interface ModuleWithStatus extends ModuleConfig {
    isEnabled: boolean;
}

export const fetchSiteModules = cache(
    async (siteId: string): Promise<ModuleWithStatus[]> => {
        const supabase = await createClient();

        // Get enabled modules for this site
        const { data: siteModules, error } = await supabase
            .from("site_modules")
            .select("module_name, is_enabled")
            .eq("site_id", siteId);

        if (error) {
            log.error("Error fetching site modules:", error);
            return AVAILABLE_MODULES.map((module) => ({
                ...module,
                isEnabled: module.enabledByDefault,
            }));
        }

        // Create a map of enabled modules
        const enabledModules = new Map(
            siteModules?.map((sm) => [sm.module_name, sm.is_enabled]) || [],
        );

        // Return all available modules with their enabled status
        return AVAILABLE_MODULES.map((module) => ({
            ...module,
            isEnabled: enabledModules.get(module.name) ??
                module.enabledByDefault,
        }));
    },
);

/**
 * Get list of enabled module names for a site
 */
export const getEnabledModuleNames = cache(
    async (siteId: string): Promise<string[]> => {
        const modules = await fetchSiteModules(siteId);
        return modules.filter((m) => m.isEnabled).map((m) => m.name);
    },
);

/**
 * Fetch data for inventory page with last modification info
 * Uses new unified inventory system
 */
export const fetchInventoryData = cache(async (siteId: string) => {
    const supabase = await createClient();

    const [
        itemsResult,
        categoriesResult,
        suppliersResult,
        unitsResult,
        warehousesResult,
        stockResult,
    ] = await Promise.all([
        supabase
            .from("inventory_items")
            .select(`
                *,
                category:inventory_categories(*),
                supplier:inventory_suppliers(*),
                variants:inventory_item_variants(
                    *,
                    unit:inventory_units(*)
                )
            `)
            .eq("site_id", siteId)
            .eq("is_active", true)
            .order("name", { ascending: true }),
        supabase
            .from("inventory_categories")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true }),
        supabase
            .from("inventory_suppliers")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true }),
        supabase
            .from("inventory_units")
            .select("*")
            .order("name", { ascending: true }),
        supabase
            .from("inventory_warehouses")
            .select("*")
            .eq("site_id", siteId)
            .order("name", { ascending: true }),
        supabase
            .from("inventory_stock")
            .select("*")
            .eq("site_id", siteId),
    ]);

    const items = itemsResult.data || [];
    const stock = stockResult.data || [];

    // Create stock lookup map (variant_id -> total quantity)
    const stockMap = new Map<string, number>();
    stock.forEach((s: any) => {
        const currentQty = stockMap.get(s.variant_id) || 0;
        stockMap.set(s.variant_id, currentQty + (s.quantity || 0));
    });

    // Flatten items with variants for display
    // Each variant becomes a row in the inventory table
    const inventory: any[] = [];
    items.forEach((item: any) => {
        const variants = item.variants || [];
        if (variants.length === 0) {
            // Item without variants (shouldn't happen, but handle gracefully)
            inventory.push({
                id: item.id,
                item_id: item.id,
                variant_id: null,
                site_id: item.site_id,
                name: item.name,
                description: item.description,
                item_type: item.item_type,
                category_id: item.category_id,
                supplier_id: item.supplier_id,
                category: item.category,
                supplier: item.supplier,
                is_stocked: item.is_stocked,
                is_consumable: item.is_consumable,
                is_active: item.is_active,
                // Variant fields
                internal_code: null,
                supplier_code: null,
                producer: null,
                producer_code: null,
                unit_id: null,
                unit: null,
                purchase_unit_price: null,
                sell_unit_price: null,
                attributes: {},
                image_url: null,
                url_tds: null,
                warehouse_number: null,
                stock_quantity: 0,
                created_at: item.created_at,
                updated_at: item.updated_at,
                lastAction: null,
            });
        } else {
            variants.forEach((variant: any) => {
                const attrs = variant.attributes || {};
                inventory.push({
                    id: variant.id, // Use variant ID as primary ID for the row
                    item_id: item.id,
                    variant_id: variant.id,
                    site_id: item.site_id,
                    name: item.name,
                    description: item.description,
                    item_type: item.item_type,
                    category_id: item.category_id,
                    supplier_id: item.supplier_id,
                    category: item.category,
                    supplier: item.supplier,
                    is_stocked: item.is_stocked,
                    is_consumable: item.is_consumable,
                    is_active: item.is_active,
                    // Variant fields
                    internal_code: variant.internal_code,
                    supplier_code: variant.supplier_code,
                    producer: variant.producer,
                    producer_code: variant.producer_code,
                    unit_id: variant.unit_id,
                    unit: variant.unit,
                    purchase_unit_price: variant.purchase_unit_price,
                    sell_unit_price: variant.sell_unit_price,
                    attributes: attrs,
                    image_url: variant.image_url,
                    url_tds: variant.url_tds,
                    warehouse_number: variant.warehouse_number,
                    // Flattened attributes for easy access
                    color: attrs.color,
                    color_code: attrs.color_code,
                    width: attrs.width,
                    height: attrs.height,
                    length: attrs.length,
                    thickness: attrs.thickness,
                    diameter: attrs.diameter,
                    subcategory: attrs.subcategory,
                    subcategory_code: attrs.subcategory_code,
                    subcategory2: attrs.subcategory2,
                    subcategory2_code: attrs.subcategory2_code,
                    // Stock
                    stock_quantity: stockMap.get(variant.id) || 0,
                    quantity: stockMap.get(variant.id) || 0, // Alias for compatibility
                    // Legacy compatibility fields
                    unit_price: variant.purchase_unit_price,
                    sell_price: variant.sell_unit_price,
                    total_price: (variant.purchase_unit_price || 0) *
                        (stockMap.get(variant.id) || 0),
                    created_at: variant.created_at || item.created_at,
                    updated_at: variant.updated_at || item.updated_at,
                    lastAction: null,
                });
            });
        }
    });

    return {
        inventory,
        categories: categoriesResult.data || [],
        suppliers: suppliersResult.data || [],
        units: unitsResult.data || [],
        warehouses: warehousesResult.data || [],
    };
});

/**
 * Fetch internal activities for timetracking
 */
export const fetchInternalActivities = cache(async (siteId: string) => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("internal_activities")
        .select("id, code, label, site_id, sort_order")
        .eq("is_active", true)
        .or(`site_id.is.null,site_id.eq.${siteId}`)
        .order("sort_order", { ascending: true });

    if (error) {
        log.error("Error fetching internal activities:", error);
        return [];
    }

    return data || [];
});

/**
 * Fetch data for timetracking page
 */
export const fetchTimetrackingData = cache(async (siteId: string) => {
    const [timetrackings, tasks, users, roles, internalActivities] =
        await Promise.all([
            fetchTimetracking(siteId),
            fetchTasks(siteId),
            fetchUsers(siteId),
            fetchRoles(siteId),
            fetchInternalActivities(siteId),
        ]);

    return { timetrackings, tasks, users, roles, internalActivities };
});

/**
 * Fetch data for projects page
 */
export const fetchProjectsData = cache(async (siteId: string) => {
    const [clients, products, kanbans, tasks, categories] = await Promise.all([
        fetchClients(siteId),
        fetchSellProducts(siteId),
        fetchKanbans(siteId),
        fetchTasksWithRelations(siteId),
        fetchSellProductCategories(siteId),
    ]);

    return { clients, activeProducts: products, kanbans, tasks, categories };
});

// ============================================
// DASHBOARD DATA
// ============================================

export interface DashboardStats {
    // Offers statistics
    offers: {
        todo: number;
        inProgress: number;
        sent: number;
        won: number;
        lost: number;
        totalValue: number;
        byCategory: Array<{
            name: string;
            color: string;
            count: number;
            value: number;
        }>;
    };
    // Production orders statistics
    orders: {
        totalProjects: number;
        totalItems: number;
        totalValue: number;
        byCategory: Array<{
            name: string;
            color: string;
            projects: number;
            items: number;
            value: number;
        }>;
    };
    // HR statistics
    hr: {
        totalEmployees: number;
        activeEmployees: number;
    };
    // Financial summary
    financial: {
        totalOrdersValue: number;
        monthlyChange: number;
    };
    // Active offers KPI
    activeOffers: {
        count: number;
        totalValue: number;
        changePercent: number;
    };
    // Production orders KPI
    productionOrders: {
        total: number;
        delayed: number;
        delayedChange: number;
    };
    // Open invoices KPI
    openInvoices: {
        totalValue: number;
        expiredCount: number;
        changePercent: number;
    };
    // AVOR workload KPI
    avorWorkload: {
        percentage: number;
        status: string;
    };
    // Pipeline data for 6 months chart
    pipelineData: Array<{
        month: string;
        value: number;
    }>;
    // Department workload data
    departmentWorkload: Array<{
        department: string;
        count: number;
    }>;
    // Aggregated kanban status
    kanbanStatus: Array<{
        department: string;
        status: string;
        count: number;
    }>;
}

/**
 * Fetch dashboard statistics for a site
 */
export const fetchDashboardData = cache(
    async (siteId: string): Promise<DashboardStats> => {
        const supabase = await createClient();

        // Get date ranges for period calculations
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
        );
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Calculate date ranges for historical data (6 months)
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        // First fetch kanbans to get their IDs for column query
        const kanbansResult = await supabase
            .from("Kanban")
            .select("id, is_offer_kanban, title, identifier")
            .eq("site_id", siteId);

        const kanbans = kanbansResult.data || [];
        const kanbanIds = kanbans.map((k) => k.id);

        // Fetch remaining data in parallel
        const [
            tasksResult,
            categoriesResult,
            usersResult,
            columnsResult,
            historicalTasksResult,
        ] = await Promise.all([
            // All tasks (not archived) - include deliveryDate for delayed orders
            supabase
                .from("Task")
                .select(`
                id,
                task_type,
                display_mode,
                sellPrice,
                positions,
                kanbanId,
                kanbanColumnId,
                sellProductId,
                created_at,
                sent_date,
                deliveryDate,
                SellProduct:sellProductId(id, name, category:category_id(id, name, color))
            `)
                .eq("site_id", siteId)
                .eq("archived", false),
            // Categories
            supabase
                .from("sellproduct_categories")
                .select("*")
                .eq("site_id", siteId),
            // Users (for HR)
            supabase
                .from("user_sites")
                .select("user_id")
                .eq("site_id", siteId),
            // Kanban columns - filter by kanbanId, not site_id
            kanbanIds.length > 0
                ? supabase
                    .from("KanbanColumn")
                    .select("id, kanbanId, column_type, title, position")
                    .in("kanbanId", kanbanIds)
                : Promise.resolve({ data: [] }),
            // Historical tasks for pipeline chart (last 6 months)
            supabase
                .from("Task")
                .select(`
                id,
                task_type,
                sellPrice,
                created_at,
                kanbanId
            `)
                .eq("site_id", siteId)
                .eq("archived", false)
                .gte("created_at", sixMonthsAgo.toISOString()),
        ]);

        const tasks = tasksResult.data || [];
        const categories = categoriesResult.data || [];
        const userSites = usersResult.data || [];
        const columns = columnsResult.data || [];
        const historicalTasks = historicalTasksResult.data || [];

        // Create lookup maps
        const offerKanbanIds = new Set(
            kanbans.filter((k) => k.is_offer_kanban).map((k) => k.id),
        );
        const columnMap = new Map(columns.map((c) => [c.id, c]));
        const kanbanMap = new Map(kanbans.map((k) => [k.id, k]));

        // Map kanban names to departments
        const getDepartmentName = (kanbanId: number | null): string => {
            if (!kanbanId) return "Altro";
            const kanban = kanbanMap.get(kanbanId);
            if (!kanban) return "Altro";

            // Check if it's an offer kanban first
            if (kanban.is_offer_kanban) return "Vendita";

            const name = (kanban.title || kanban.identifier || "")
                .toLowerCase();

            // Map common kanban names to department names (more comprehensive matching)
            if (
                name.includes("avor") || name.includes("ufficio") ||
                name.includes("ufficio tecnico")
            ) return "AVOR";
            if (
                name.includes("vendita") || name.includes("offerta") ||
                name.includes("commerciale")
            ) return "Vendita";
            if (
                name.includes("produzione") || name.includes("prod") ||
                name.includes("officina") || name.includes("lavorazione")
            ) return "Prod.";
            if (
                name.includes("fattura") || name.includes("fatturazione") ||
                name.includes("billing")
            ) return "Fatturazione";
            if (
                name.includes("install") || name.includes("montaggio") ||
                name.includes("cantiere")
            ) return "Install.";
            if (
                name.includes("service") || name.includes("assistenza") ||
                name.includes("manutenzione")
            ) return "Service";

            // If no match, return the original name capitalized, or "Altro"
            const originalName = kanban.title || kanban.identifier || "";
            return originalName
                ? originalName.charAt(0).toUpperCase() + originalName.slice(1)
                : "Altro";
        };

        // Initialize category stats map
        const categoryStatsMap = new Map<string, {
            name: string;
            color: string;
            offerCount: number;
            offerValue: number;
            orderCount: number;
            orderItems: number;
            orderValue: number;
        }>();

        // Initialize with existing categories
        categories.forEach((cat) => {
            categoryStatsMap.set(cat.name, {
                name: cat.name,
                color: cat.color || "#3b82f6",
                offerCount: 0,
                offerValue: 0,
                orderCount: 0,
                orderItems: 0,
                orderValue: 0,
            });
        });

        // Add default category for tasks without category
        if (!categoryStatsMap.has("Altro")) {
            categoryStatsMap.set("Altro", {
                name: "Altro",
                color: "#6b7280",
                offerCount: 0,
                offerValue: 0,
                orderCount: 0,
                orderItems: 0,
                orderValue: 0,
            });
        }

        // Offer statistics
        let offersTodo = 0;
        let offersInProgress = 0;
        let offersSent = 0;
        let offersWon = 0;
        let offersLost = 0;
        let offersTotalValue = 0;

        // Order statistics
        let ordersTotalProjects = 0;
        let ordersTotalItems = 0;
        let ordersTotalValue = 0;

        // Process tasks
        tasks.forEach((task: any) => {
            const column = columnMap.get(task.kanbanColumnId);
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            const categoryName = task.SellProduct?.category?.name || "Altro";
            const categoryColor = task.SellProduct?.category?.color ||
                "#6b7280";
            const sellPrice = task.sellPrice || 0;
            const positionsCount = task.positions?.length || 1;

            // Ensure category exists in map
            if (!categoryStatsMap.has(categoryName)) {
                categoryStatsMap.set(categoryName, {
                    name: categoryName,
                    color: categoryColor,
                    offerCount: 0,
                    offerValue: 0,
                    orderCount: 0,
                    orderItems: 0,
                    orderValue: 0,
                });
            }

            const catStats = categoryStatsMap.get(categoryName)!;

            if (isOffer) {
                // Process as offer
                offersTotalValue += sellPrice;
                catStats.offerCount++;
                catStats.offerValue += sellPrice;

                if (
                    task.display_mode === "small_green" ||
                    column?.column_type === "won"
                ) {
                    offersWon++;
                } else if (
                    task.display_mode === "small_red" ||
                    column?.column_type === "lost"
                ) {
                    offersLost++;
                } else if (task.sent_date) {
                    offersSent++;
                } else if (
                    column?.position === 0 ||
                    column?.title?.toLowerCase().includes("todo") ||
                    column?.title?.toLowerCase().includes("da fare")
                ) {
                    offersTodo++;
                } else {
                    offersInProgress++;
                }
            } else {
                // Process as production order
                ordersTotalProjects++;
                ordersTotalItems += positionsCount;
                ordersTotalValue += sellPrice;
                catStats.orderCount++;
                catStats.orderItems += positionsCount;
                catStats.orderValue += sellPrice;
            }
        });

        // Get user count (HR)
        // Count unique active users
        const uniqueUserIds = new Set(userSites.map((us) => us.user_id));

        // Also fetch actual User records to get enabled count
        let activeEmployees = uniqueUserIds.size;
        if (uniqueUserIds.size > 0) {
            const { data: users } = await supabase
                .from("User")
                .select("id, enabled")
                .eq("enabled", true)
                .in("authId", Array.from(uniqueUserIds));
            activeEmployees = users?.length || uniqueUserIds.size;
        }

        // Convert category map to arrays
        const categoriesArray = Array.from(categoryStatsMap.values());

        // Sort categories by value/count descending and filter out empty ones
        const offersByCategory = categoriesArray
            .filter((c) => c.offerCount > 0)
            .map((c) => ({
                name: c.name,
                color: c.color,
                count: c.offerCount,
                value: c.offerValue,
            }))
            .sort((a, b) => b.value - a.value);

        const ordersByCategory = categoriesArray
            .filter((c) => c.orderCount > 0)
            .map((c) => ({
                name: c.name,
                color: c.color,
                projects: c.orderCount,
                items: c.orderItems,
                value: c.orderValue,
            }))
            .sort((a, b) => b.value - a.value);

        // Calculate Active Offers KPI (todo + inProgress, excluding won/lost)
        const activeOffersTasks = tasks.filter((task: any) => {
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            if (!isOffer) return false;
            const column = columnMap.get(task.kanbanColumnId);
            const isWon = task.display_mode === "small_green" ||
                column?.column_type === "won";
            const isLost = task.display_mode === "small_red" ||
                column?.column_type === "lost";
            return !isWon && !isLost;
        });

        const activeOffersCount = activeOffersTasks.length;
        const activeOffersValue = activeOffersTasks.reduce(
            (sum: number, task: any) => sum + (task.sellPrice || 0),
            0,
        );

        // Calculate offer change percent (value comparison: current month vs last month)
        const currentMonthOffersValue = tasks
            .filter((task: any) => {
                const isOffer = task.task_type === "OFFERTA" ||
                    offerKanbanIds.has(task.kanbanId);
                if (!isOffer) return false;
                const taskDate = new Date(task.created_at);
                return taskDate >= startOfMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);

        const lastMonthOffersValue = tasks
            .filter((task: any) => {
                const isOffer = task.task_type === "OFFERTA" ||
                    offerKanbanIds.has(task.kanbanId);
                if (!isOffer) return false;
                const taskDate = new Date(task.created_at);
                return taskDate >= startOfLastMonth &&
                    taskDate <= endOfLastMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);

        const offerChangePercent = lastMonthOffersValue > 0
            ? ((currentMonthOffersValue - lastMonthOffersValue) /
                lastMonthOffersValue) * 100
            : 0;

        // Calculate Production Orders KPI (delayed orders)
        const delayedOrders = tasks.filter((task: any) => {
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            if (isOffer) return false;
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            return deliveryDate < now;
        }).length;

        // Calculate delayed change (simplified - compare with last month)
        const lastMonthDelayed = tasks.filter((task: any) => {
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            if (isOffer) return false;
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            const taskCreated = new Date(task.created_at);
            return deliveryDate < endOfLastMonth &&
                taskCreated <= endOfLastMonth;
        }).length;

        const delayedChange = lastMonthDelayed > 0
            ? delayedOrders - lastMonthDelayed
            : 0;

        // Calculate Open Invoices KPI
        const invoiceTasks = tasks.filter((task: any) =>
            task.task_type === "FATTURA"
        );
        const openInvoicesValue = invoiceTasks.reduce(
            (sum: number, task: any) => sum + (task.sellPrice || 0),
            0,
        );

        // Find expired invoices (deliveryDate < today for invoices)
        const expiredInvoices = invoiceTasks.filter((task: any) => {
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            return deliveryDate < now;
        }).length;

        // Calculate invoice change percent (value comparison)
        const currentMonthInvoicesValue = invoiceTasks
            .filter((task: any) => {
                const taskDate = new Date(task.created_at);
                return taskDate >= startOfMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);

        const lastMonthInvoicesValue = invoiceTasks
            .filter((task: any) => {
                const taskDate = new Date(task.created_at);
                return taskDate >= startOfLastMonth &&
                    taskDate <= endOfLastMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);

        const invoiceChangePercent = lastMonthInvoicesValue > 0
            ? ((currentMonthInvoicesValue - lastMonthInvoicesValue) /
                lastMonthInvoicesValue) * 100
            : 0;

        // Calculate AVOR Workload
        const avorKanbanIds = Array.from(kanbanMap.values())
            .filter((k) => {
                const name = (k.title || k.identifier || "")
                    .toLowerCase();
                return name.includes("avor") || name.includes("ufficio");
            })
            .map((k) => k.id);

        const avorTasks = tasks.filter((task: any) =>
            avorKanbanIds.includes(task.kanbanId)
        );
        const totalTasks = tasks.length;
        const avorPercentage = totalTasks > 0
            ? (avorTasks.length / totalTasks) * 100
            : 0;
        const avorStatus = avorPercentage >= 80
            ? "Saturazione team"
            : avorPercentage >= 60
            ? "Carico elevato"
            : "Carico normale";

        // Calculate Pipeline Data (6 months)
        const pipelineDataMap = new Map<string, number>();
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(now.getMonth() - i);
            const monthKey = `${monthNames[date.getMonth()]} ${
                date.getFullYear().toString().slice(-2)
            }`;
            pipelineDataMap.set(monthKey, 0);
        }

        // Aggregate historical offer values by month
        historicalTasks.forEach((task: any) => {
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            if (!isOffer) return;

            const taskDate = new Date(task.created_at);
            const monthKey = `${monthNames[taskDate.getMonth()]} ${
                taskDate.getFullYear().toString().slice(-2)
            }`;

            if (pipelineDataMap.has(monthKey)) {
                pipelineDataMap.set(
                    monthKey,
                    pipelineDataMap.get(monthKey)! + (task.sellPrice || 0),
                );
            }
        });

        const pipelineData = Array.from(pipelineDataMap.entries()).map((
            [month, value],
        ) => ({
            month,
            value,
        }));

        // Calculate Department Workload
        const departmentWorkloadMap = new Map<string, number>();
        tasks.forEach((task: any) => {
            const department = getDepartmentName(task.kanbanId);
            departmentWorkloadMap.set(
                department,
                (departmentWorkloadMap.get(department) || 0) + 1,
            );
        });

        const departmentWorkload = Array.from(departmentWorkloadMap.entries())
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);

        // Calculate Aggregated Kanban Status
        const kanbanStatusMap = new Map<
            string,
            { status: string; count: number }
        >();

        // Map columns to status names
        const getStatusName = (column: any): string => {
            if (!column) return "Sconosciuto";
            const title = column.title?.toLowerCase() || "";
            if (
                title.includes("trattativa") || title.includes("negoziazione")
            ) return "In trattativa";
            if (title.includes("lavorazione") || title.includes("lavoro")) {
                return "In lavorazione";
            }
            if (title.includes("corso") || title.includes("produzione")) {
                return "In corso";
            }
            if (title.includes("emettere") || title.includes("fattura")) {
                return "Da emettere";
            }
            if (title.includes("completato") || title.includes("finito")) {
                return "Completato";
            }
            return column.title || "Sconosciuto";
        };

        tasks.forEach((task: any) => {
            const department = getDepartmentName(task.kanbanId);
            const column = columnMap.get(task.kanbanColumnId);
            const status = getStatusName(column);
            const key = `${department}-${status}`;

            kanbanStatusMap.set(key, {
                status,
                count: (kanbanStatusMap.get(key)?.count || 0) + 1,
            });
        });

        // Group by department and get the most common status
        const departmentStatusMap = new Map<
            string,
            { status: string; count: number }
        >();
        kanbanStatusMap.forEach((value, key) => {
            const department = key.split("-")[0];
            const existing = departmentStatusMap.get(department);
            if (!existing || value.count > existing.count) {
                departmentStatusMap.set(department, value);
            }
        });

        const kanbanStatus = Array.from(departmentStatusMap.entries())
            .map(([department, { status, count }]) => ({
                department,
                status,
                count,
            }))
            .filter((item) =>
                ["Vendita", "AVOR", "Produzione", "Fatturazione"].includes(
                    item.department,
                )
            );

        return {
            offers: {
                todo: offersTodo,
                inProgress: offersInProgress,
                sent: offersSent,
                won: offersWon,
                lost: offersLost,
                totalValue: offersTotalValue,
                byCategory: offersByCategory,
            },
            orders: {
                totalProjects: ordersTotalProjects,
                totalItems: ordersTotalItems,
                totalValue: ordersTotalValue,
                byCategory: ordersByCategory,
            },
            hr: {
                totalEmployees: uniqueUserIds.size,
                activeEmployees,
            },
            financial: {
                totalOrdersValue: ordersTotalValue,
                monthlyChange: 0, // Would need historical data to calculate
            },
            activeOffers: {
                count: activeOffersCount,
                totalValue: activeOffersValue,
                changePercent: offerChangePercent,
            },
            productionOrders: {
                total: ordersTotalProjects,
                delayed: delayedOrders,
                delayedChange: delayedChange,
            },
            openInvoices: {
                totalValue: openInvoicesValue,
                expiredCount: expiredInvoices,
                changePercent: invoiceChangePercent,
            },
            avorWorkload: {
                percentage: avorPercentage,
                status: avorStatus,
            },
            pipelineData,
            departmentWorkload,
            kanbanStatus,
        };
    },
);

// ============================================
// VENDITA DASHBOARD DATA
// ============================================

export interface VenditaDashboardStats {
    // Offer status counts with values
    offerStatus: {
        todo: { count: number; value: number };
        inviate: { count: number; value: number };
        inTrattativa: { count: number; value: number };
        vinte: { count: number; value: number };
        perse: { count: number; value: number };
    };
    // Categories data for horizontal bar chart
    categoriesData: Array<{
        category: string;
        offerte: number;
        elementi: number;
        color: string;
    }>;
    // Pipeline trend data (monthly)
    pipelineTrend: Array<{
        month: string;
        numeroOfferte: number;
        valoreOfferte: number;
    }>;
    // KPIs
    kpis: {
        tassoConversione: { value: number; change: number };
        offerteScadute: { value: number; change: number };
    };
    // Alerts
    alerts: Array<{
        id: number;
        message: string;
        time: string;
        priority: "high" | "medium" | "low";
    }>;
}

export const fetchVenditaDashboardData = cache(
    async (siteId: string): Promise<VenditaDashboardStats> => {
        const supabase = await createClient();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
        );
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        // First fetch kanbans to get their IDs
        const kanbansResult = await supabase
            .from("Kanban")
            .select("id, is_offer_kanban, title, identifier, category_id")
            .eq("site_id", siteId);

        const kanbans = kanbansResult.data || [];
        const kanbanIds = kanbans.map((k) => k.id);

        // Then fetch remaining data in parallel
        const [
            tasksResult,
            columnsResult,
            kanbanCategoriesResult,
            historicalTasksResult,
        ] = await Promise.all([
            // All tasks (not archived)
            supabase
                .from("Task")
                .select(`
                    id,
                    unique_code,
                    name,
                    task_type,
                    display_mode,
                    sellPrice,
                    positions,
                    kanbanId,
                    kanbanColumnId,
                    created_at,
                    sent_date,
                    deliveryDate,
                    clientId,
                    Client:clientId(id, businessName)
                `)
                .eq("site_id", siteId)
                .eq("archived", false),
            // Kanban columns - filter by kanbanId, not site_id
            kanbanIds.length > 0
                ? supabase
                    .from("KanbanColumn")
                    .select("id, kanbanId, column_type, title, position")
                    .in("kanbanId", kanbanIds)
                : Promise.resolve({ data: [], error: null }),
            // Kanban categories
            supabase
                .from("KanbanCategory")
                .select("id, name, color")
                .eq("site_id", siteId),
            // Historical tasks for trend chart
            supabase
                .from("Task")
                .select(`
                    id,
                    task_type,
                    display_mode,
                    sellPrice,
                    created_at,
                    kanbanId,
                    kanbanColumnId
                `)
                .eq("site_id", siteId)
                .eq("archived", false)
                .gte("created_at", sixMonthsAgo.toISOString()),
        ]);

        const tasks = tasksResult.data || [];
        const columns = columnsResult.data || [];
        const kanbanCategories = kanbanCategoriesResult.data || [];
        const historicalTasks = historicalTasksResult.data || [];

        // Create lookup maps
        const offerKanbanIds = new Set(
            kanbans.filter((k) => k.is_offer_kanban).map((k) => k.id),
        );
        const columnMap = new Map(columns.map((c) => [c.id, c]));
        const kanbanMap = new Map(kanbans.map((k) => [k.id, k]));
        const categoryMap = new Map(
            kanbanCategories.map((c) => [c.id, c]),
        );

        // Filter only offers
        const offers = tasks.filter(
            (task: any) =>
                task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId),
        );

        // Initialize status counters
        const offerStatus = {
            todo: { count: 0, value: 0 },
            inviate: { count: 0, value: 0 },
            inTrattativa: { count: 0, value: 0 },
            vinte: { count: 0, value: 0 },
            perse: { count: 0, value: 0 },
        };

        // Category stats
        const categoryStatsMap = new Map<
            string,
            { offerte: number; elementi: number; color: string }
        >();

        // Process offers

        offers.forEach((task: any) => {
            const column = columnMap.get(task.kanbanColumnId);
            const sellPrice = task.sellPrice || 0;
            const positionsCount = task.positions?.length || 1;

            // Get category from Kanban
            const kanban = kanbanMap.get(task.kanbanId);
            const category = kanban?.category_id
                ? categoryMap.get(kanban.category_id)
                : null;
            const categoryName = category?.name || "Senza Categoria";
            const categoryColor = category?.color || "#6b7280";

            // Update category stats
            if (!categoryStatsMap.has(categoryName)) {
                categoryStatsMap.set(categoryName, {
                    offerte: 0,
                    elementi: 0,
                    color: categoryColor,
                });
            }
            const catStats = categoryStatsMap.get(categoryName)!;
            catStats.offerte++;
            catStats.elementi += positionsCount;

            // Categorize by status
            if (
                task.display_mode === "small_green" ||
                column?.column_type === "won"
            ) {
                offerStatus.vinte.count++;
                offerStatus.vinte.value += sellPrice;
            } else if (
                task.display_mode === "small_red" ||
                column?.column_type === "lost"
            ) {
                offerStatus.perse.count++;
                offerStatus.perse.value += sellPrice;
            } else if (task.sent_date) {
                // Sent but not won/lost - check if in negotiation based on column
                const columnTitle = column?.title?.toLowerCase() || "";
                if (
                    columnTitle.includes("trattativa") ||
                    columnTitle.includes("negoziazione")
                ) {
                    offerStatus.inTrattativa.count++;
                    offerStatus.inTrattativa.value += sellPrice;
                } else {
                    offerStatus.inviate.count++;
                    offerStatus.inviate.value += sellPrice;
                }
            } else if (
                column?.position === 0 ||
                column?.title?.toLowerCase().includes("todo") ||
                column?.title?.toLowerCase().includes("da fare")
            ) {
                offerStatus.todo.count++;
                offerStatus.todo.value += sellPrice;
            } else {
                // Default to "in trattativa" for work in progress
                offerStatus.inTrattativa.count++;
                offerStatus.inTrattativa.value += sellPrice;
            }
        });

        // Calculate categories data
        const categoriesData = Array.from(categoryStatsMap.entries())
            .map(([category, stats]) => ({
                category,
                offerte: stats.offerte,
                elementi: stats.elementi,
                color: stats.color,
            }))
            .sort((a, b) => b.elementi - a.elementi);

        // Calculate pipeline trend (6 months)
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];

        const pipelineTrendMap = new Map<
            string,
            { numeroOfferte: number; valoreOfferte: number }
        >();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(now.getMonth() - i);
            const monthKey = monthNames[date.getMonth()];
            pipelineTrendMap.set(monthKey, {
                numeroOfferte: 0,
                valoreOfferte: 0,
            });
        }

        // Aggregate historical data
        historicalTasks.forEach((task: any) => {
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            if (!isOffer) return;

            const taskDate = new Date(task.created_at);
            const monthKey = monthNames[taskDate.getMonth()];

            if (pipelineTrendMap.has(monthKey)) {
                const current = pipelineTrendMap.get(monthKey)!;
                current.numeroOfferte++;
                current.valoreOfferte += task.sellPrice || 0;
            }
        });

        const pipelineTrend = Array.from(pipelineTrendMap.entries()).map(
            ([month, data]) => ({
                month,
                numeroOfferte: data.numeroOfferte,
                valoreOfferte: data.valoreOfferte,
            }),
        );

        // Calculate KPIs
        const totalOffers = offerStatus.vinte.count +
            offerStatus.perse.count +
            offerStatus.inviate.count +
            offerStatus.inTrattativa.count +
            offerStatus.todo.count;
        const wonCount = offerStatus.vinte.count;
        const closedCount = wonCount + offerStatus.perse.count;

        // Conversion rate
        const tassoConversione = closedCount > 0
            ? (wonCount / closedCount) * 100
            : 0;

        // Calculate last month conversion for change
        const lastMonthOffers = historicalTasks.filter((task: any) => {
            const isOffer = task.task_type === "OFFERTA" ||
                offerKanbanIds.has(task.kanbanId);
            if (!isOffer) return false;
            const taskDate = new Date(task.created_at);
            return (
                taskDate >= startOfLastMonth && taskDate <= endOfLastMonth
            );
        });
        const lastMonthWon = lastMonthOffers.filter((task: any) => {
            const column = columnMap.get(task.kanbanColumnId);
            return (
                task.display_mode === "small_green" ||
                column?.column_type === "won"
            );
        }).length;
        const lastMonthLost = lastMonthOffers.filter((task: any) => {
            const column = columnMap.get(task.kanbanColumnId);
            return (
                task.display_mode === "small_red" ||
                column?.column_type === "lost"
            );
        }).length;
        const lastMonthClosed = lastMonthWon + lastMonthLost;
        const lastMonthConversion = lastMonthClosed > 0
            ? (lastMonthWon / lastMonthClosed) * 100
            : 0;
        const conversionChange = Math.round(
            tassoConversione - lastMonthConversion,
        );

        // Expired offers (offers with deliveryDate in the past that are not won/lost)
        const expiredOffers = offers.filter((task: any) => {
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            const column = columnMap.get(task.kanbanColumnId);
            const isWon = task.display_mode === "small_green" ||
                column?.column_type === "won";
            const isLost = task.display_mode === "small_red" ||
                column?.column_type === "lost";
            return deliveryDate < now && !isWon && !isLost;
        });
        const offerteScadute = expiredOffers.length;

        // Calculate expired change (last month)
        const lastMonthExpired = lastMonthOffers.filter((task: any) => {
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            return deliveryDate < endOfLastMonth;
        }).length;
        const scaduteChange = offerteScadute - lastMonthExpired;

        // Generate alerts
        const alerts: VenditaDashboardStats["alerts"] = [];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find offers expiring soon
        offers.forEach((task: any) => {
            if (!task.deliveryDate) return;
            const deliveryDate = new Date(task.deliveryDate);
            const column = columnMap.get(task.kanbanColumnId);
            const isWon = task.display_mode === "small_green" ||
                column?.column_type === "won";
            const isLost = task.display_mode === "small_red" ||
                column?.column_type === "lost";

            if (isWon || isLost) return;

            const daysUntilExpiry = Math.ceil(
                (deliveryDate.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            if (daysUntilExpiry <= 1 && daysUntilExpiry >= 0) {
                alerts.push({
                    id: task.id,
                    message: `Offerta #${
                        task.unique_code || task.id
                    } in scadenza ${daysUntilExpiry === 0 ? "oggi" : "domani"}`,
                    time: daysUntilExpiry === 0 ? "oggi" : "1g",
                    priority: "high",
                });
            } else if (daysUntilExpiry < 0) {
                alerts.push({
                    id: task.id,
                    message: `Offerta #${
                        task.unique_code || task.id
                    } scaduta da ${Math.abs(daysUntilExpiry)}g`,
                    time: `${Math.abs(daysUntilExpiry)}g`,
                    priority: "high",
                });
            }
        });

        // Find offers waiting for client response (sent but no update in 7+ days)
        offers.forEach((task: any) => {
            if (!task.sent_date) return;
            const sentDate = new Date(task.sent_date);
            const column = columnMap.get(task.kanbanColumnId);
            const isWon = task.display_mode === "small_green" ||
                column?.column_type === "won";
            const isLost = task.display_mode === "small_red" ||
                column?.column_type === "lost";

            if (isWon || isLost) return;

            const daysSinceSent = Math.floor(
                (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysSinceSent >= 7 && alerts.length < 5) {
                const clientName = task.Client?.businessName || "Cliente";
                alerts.push({
                    id: task.id,
                    message: `${clientName} attende risposta per Offerta #${
                        task.unique_code || task.id
                    }`,
                    time: `${daysSinceSent}g`,
                    priority: "medium",
                });
            }
        });

        // Limit to 5 alerts, sorted by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        alerts.sort((a, b) =>
            priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        const limitedAlerts = alerts.slice(0, 5);

        return {
            offerStatus,
            categoriesData,
            pipelineTrend,
            kpis: {
                tassoConversione: {
                    value: Math.round(tassoConversione),
                    change: conversionChange,
                },
                offerteScadute: {
                    value: offerteScadute,
                    change: scaduteChange,
                },
            },
            alerts: limitedAlerts,
        };
    },
);

// ============================================
// AVOR DASHBOARD DATA
// ============================================

export interface AvorColumnStatus {
    columnId: number;
    columnName: string;
    count: number;
    delayed: number;
    position: number;
}

export interface AvorWorkloadData {
    category: string;
    color: string;
    columns: Array<{
        columnName: string;
        count: number;
    }>;
}

export interface AvorWeeklyTrend {
    week: string;
    columns: Array<{
        columnName: string;
        count: number;
    }>;
}

export interface AvorAlert {
    id: number;
    message: string;
    type: "delayed" | "stale" | "missing_data";
    priority: "high" | "medium" | "low";
    taskCode?: string;
    daysOverdue?: number;
    daysSinceUpdate?: number;
}

export interface AvorDashboardStats {
    // Status per column
    columnStatus: AvorColumnStatus[];
    // Workload by category and column
    workloadData: AvorWorkloadData[];
    // Column names for charts
    columnNames: string[];
    // Weekly trend data
    weeklyTrend: AvorWeeklyTrend[];
    // Alerts and criticalities
    alerts: AvorAlert[];
    // AVOR Kanban ID for filtering
    avorKanbanId: number | null;
}

export const fetchAvorDashboardData = cache(
    async (siteId: string): Promise<AvorDashboardStats> => {
        const supabase = await createClient();

        const now = new Date();
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(now.getDate() - 28);

        // First find AVOR kanban(s) - by is_work_kanban flag or name pattern
        const kanbansResult = await supabase
            .from("Kanban")
            .select("id, title, identifier, is_work_kanban, color")
            .eq("site_id", siteId);

        const allKanbans = kanbansResult.data || [];

        // Find AVOR kanban - prefer is_work_kanban flag, fallback to name matching
        const avorKanbans = allKanbans.filter((k) => {
            if (k.is_work_kanban) return true;
            const name = (k.title || k.identifier || "").toLowerCase();
            return name.includes("avor") || name.includes("ufficio");
        });

        if (avorKanbans.length === 0) {
            // No AVOR kanban found
            return {
                columnStatus: [],
                workloadData: [],
                columnNames: [],
                weeklyTrend: [],
                alerts: [],
                avorKanbanId: null,
            };
        }

        const avorKanban = avorKanbans[0]; // Use first AVOR kanban
        const avorKanbanId = avorKanban.id;

        // Fetch columns for this kanban and tasks
        const [columnsResult, tasksResult, categoriesResult] = await Promise
            .all(
                [
                    supabase
                        .from("KanbanColumn")
                        .select("id, title, identifier, position")
                        .eq("kanbanId", avorKanbanId)
                        .order("position", { ascending: true }),
                    supabase
                        .from("Task")
                        .select(
                            `
                    id,
                    unique_code,
                    name,
                    kanbanId,
                    kanbanColumnId,
                    deliveryDate,
                    created_at,
                    updated_at,
                    archived,
                    SellProduct:sellProductId(id, name, category:category_id(id, name, color))
                `,
                        )
                        .eq("kanbanId", avorKanbanId)
                        .eq("archived", false),
                    supabase
                        .from("sellproduct_categories")
                        .select("id, name, color")
                        .eq("site_id", siteId),
                ],
            );

        const columns = columnsResult.data || [];
        const tasks = tasksResult.data || [];
        const categories = categoriesResult.data || [];

        // Create column map
        const columnMap = new Map(columns.map((c) => [c.id, c]));
        const columnNames = columns.map((c) =>
            c.title || c.identifier || `Col ${c.position}`
        );

        // 1. Calculate column status (KPI cards)
        const columnStatus: AvorColumnStatus[] = columns.map((col) => {
            const columnTasks = tasks.filter(
                (t: any) => t.kanbanColumnId === col.id,
            );
            const delayed = columnTasks.filter((t: any) => {
                if (!t.deliveryDate) return false;
                return new Date(t.deliveryDate) < now;
            }).length;

            return {
                columnId: col.id,
                columnName: col.title || col.identifier ||
                    `Col ${col.position}`,
                count: columnTasks.length,
                delayed,
                position: col.position,
            };
        });

        // 2. Calculate workload by category and column
        const categoryWorkloadMap = new Map<
            string,
            { color: string; columns: Map<string, number> }
        >();

        // Initialize with existing categories
        categories.forEach((cat) => {
            const colMap = new Map<string, number>();
            columnNames.forEach((name) => colMap.set(name, 0));
            categoryWorkloadMap.set(cat.name, {
                color: cat.color || "#6b7280",
                columns: colMap,
            });
        });

        // Add "Senza Categoria" default
        if (!categoryWorkloadMap.has("Senza Categoria")) {
            const colMap = new Map<string, number>();
            columnNames.forEach((name) => colMap.set(name, 0));
            categoryWorkloadMap.set("Senza Categoria", {
                color: "#6b7280",
                columns: colMap,
            });
        }

        // Count tasks per category per column
        tasks.forEach((task: any) => {
            const column = columnMap.get(task.kanbanColumnId);
            if (!column) return;

            const columnName = column.title || column.identifier ||
                `Col ${column.position}`;
            const categoryName = task.SellProduct?.category?.name ||
                "Senza Categoria";
            const categoryColor = task.SellProduct?.category?.color ||
                "#6b7280";

            if (!categoryWorkloadMap.has(categoryName)) {
                const colMap = new Map<string, number>();
                columnNames.forEach((name) => colMap.set(name, 0));
                categoryWorkloadMap.set(categoryName, {
                    color: categoryColor,
                    columns: colMap,
                });
            }

            const catData = categoryWorkloadMap.get(categoryName)!;
            catData.columns.set(
                columnName,
                (catData.columns.get(columnName) || 0) + 1,
            );
        });

        // Convert to array format
        const workloadData: AvorWorkloadData[] = Array.from(
            categoryWorkloadMap.entries(),
        )
            .filter(([_, data]) => {
                // Only include categories with at least one task
                return Array.from(data.columns.values()).some((v) => v > 0);
            })
            .map(([category, data]) => ({
                category,
                color: data.color,
                columns: columnNames.map((name) => ({
                    columnName: name,
                    count: data.columns.get(name) || 0,
                })),
            }))
            .sort((a, b) => {
                const totalA = a.columns.reduce((sum, c) => sum + c.count, 0);
                const totalB = b.columns.reduce((sum, c) => sum + c.count, 0);
                return totalB - totalA;
            });

        // 3. Calculate weekly trend (last 4 weeks)
        const weeklyTrend: AvorWeeklyTrend[] = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - i * 7 - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            const weekLabel = `Sett. ${4 - i}`;

            // Count tasks per column for this week (based on created_at)
            const weekColumns = columnNames.map((colName) => {
                const column = columns.find(
                    (c) =>
                        (c.title || c.identifier || `Col ${c.position}`) ===
                            colName,
                );
                if (!column) return { columnName: colName, count: 0 };

                const count = tasks.filter((t: any) => {
                    if (t.kanbanColumnId !== column.id) return false;
                    const createdAt = new Date(t.created_at);
                    return createdAt >= weekStart && createdAt < weekEnd;
                }).length;

                return { columnName: colName, count };
            });

            weeklyTrend.push({
                week: weekLabel,
                columns: weekColumns,
            });
        }

        // 4. Generate alerts
        const alerts: AvorAlert[] = [];

        // Delayed tasks
        tasks.forEach((task: any) => {
            if (!task.deliveryDate) return;
            const deliveryDate = new Date(task.deliveryDate);
            if (deliveryDate >= now) return;

            const daysOverdue = Math.floor(
                (now.getTime() - deliveryDate.getTime()) /
                    (1000 * 60 * 60 * 24),
            );

            alerts.push({
                id: task.id,
                message: `Pratica #${
                    task.unique_code || task.id
                } in ritardo di ${daysOverdue} giorni`,
                type: "delayed",
                priority: daysOverdue > 7 ? "high" : "medium",
                taskCode: task.unique_code || String(task.id),
                daysOverdue,
            });
        });

        // Stale tasks (no update in 14+ days)
        tasks.forEach((task: any) => {
            if (!task.updated_at) return;
            const updatedAt = new Date(task.updated_at);
            const daysSinceUpdate = Math.floor(
                (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysSinceUpdate >= 14) {
                // Avoid duplicates with delayed
                const isAlreadyDelayed = alerts.some(
                    (a) => a.id === task.id && a.type === "delayed",
                );
                if (!isAlreadyDelayed) {
                    alerts.push({
                        id: task.id,
                        message: `Pratica #${
                            task.unique_code || task.id
                        } ferma da ${daysSinceUpdate} giorni`,
                        type: "stale",
                        priority: daysSinceUpdate > 30 ? "high" : "medium",
                        taskCode: task.unique_code || String(task.id),
                        daysSinceUpdate,
                    });
                }
            }
        });

        // Missing category
        tasks.forEach((task: any) => {
            if (!task.SellProduct?.category) {
                // Check if not already in alerts
                const exists = alerts.some((a) => a.id === task.id);
                if (!exists) {
                    alerts.push({
                        id: task.id,
                        message: `Pratica #${
                            task.unique_code || task.id
                        } senza categoria articoli`,
                        type: "missing_data",
                        priority: "low",
                        taskCode: task.unique_code || String(task.id),
                    });
                }
            }
        });

        // Sort by priority and limit to 10
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        alerts.sort((a, b) =>
            priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        const limitedAlerts = alerts.slice(0, 10);

        return {
            columnStatus,
            workloadData,
            columnNames,
            weeklyTrend,
            alerts: limitedAlerts,
            avorKanbanId,
        };
    },
);

// ============================================
// PRODUZIONE DASHBOARD DATA
// ============================================

export interface ProduzioneRepartoData {
    reparto: string;
    aperti: number;
    ritardo: number;
}

export interface ProduzioneWeeklyData {
    week: string;
    columns: Array<{
        columnName: string;
        count: number;
    }>;
}

export interface ProduzioneDashboardStats {
    repartoData: ProduzioneRepartoData[];
    weeklyTrend: ProduzioneWeeklyData[];
    columnNames: string[];
    productionKanbanId: number | null;
}

export const fetchProduzioneDashboardData = cache(
    async (siteId: string): Promise<ProduzioneDashboardStats> => {
        const supabase = await createClient();

        const now = new Date();

        // Find Production kanban(s)
        const kanbansResult = await supabase
            .from("Kanban")
            .select(
                "id, title, identifier, is_production_kanban, color, category_id",
            )
            .eq("site_id", siteId);

        const allKanbans = kanbansResult.data || [];

        // Find Production kanban - prefer flag, fallback to name matching
        const productionKanbans = allKanbans.filter((k) => {
            if (k.is_production_kanban) return true;
            const name = (k.title || k.identifier || "").toLowerCase();
            return (
                name.includes("produzione") ||
                name.includes("prod") ||
                name.includes("officina") ||
                name.includes("lavorazione")
            );
        });

        if (productionKanbans.length === 0) {
            return {
                repartoData: [],
                weeklyTrend: [],
                columnNames: [],
                productionKanbanId: null,
            };
        }

        const productionKanban = productionKanbans[0];
        const productionKanbanId = productionKanban.id;

        // Fetch columns and tasks
        const [columnsResult, tasksResult] = await Promise.all([
            supabase
                .from("KanbanColumn")
                .select("id, title, identifier, position")
                .eq("kanbanId", productionKanbanId)
                .order("position", { ascending: true }),
            supabase
                .from("Task")
                .select(
                    `
                    id,
                    unique_code,
                    name,
                    kanbanId,
                    kanbanColumnId,
                    deliveryDate,
                    created_at,
                    updated_at,
                    archived
                `,
                )
                .eq("kanbanId", productionKanbanId)
                .eq("archived", false),
        ]);

        const columns = columnsResult.data || [];
        const tasks = tasksResult.data || [];

        const columnMap = new Map(columns.map((c) => [c.id, c]));
        const columnNames = columns.map(
            (c) => c.title || c.identifier || `Col ${c.position}`,
        );

        // 1. Carico per reparto (colonne = reparti/stazioni)
        const repartoData: ProduzioneRepartoData[] = columns.map((col) => {
            const columnTasks = tasks.filter(
                (t: any) => t.kanbanColumnId === col.id,
            );
            const ritardo = columnTasks.filter((t: any) => {
                if (!t.deliveryDate) return false;
                return new Date(t.deliveryDate) < now;
            }).length;

            return {
                reparto: col.title || col.identifier || `Col ${col.position}`,
                aperti: columnTasks.length,
                ritardo,
            };
        });

        // 2. Andamento settimanale (last 4 weeks)
        const weeklyTrend: ProduzioneWeeklyData[] = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - i * 7 - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            const weekLabel = `Sett. ${4 - i}`;

            const weekColumns = columnNames.map((colName) => {
                const column = columns.find(
                    (c) =>
                        (c.title || c.identifier || `Col ${c.position}`) ===
                            colName,
                );
                if (!column) return { columnName: colName, count: 0 };

                const count = tasks.filter((t: any) => {
                    if (t.kanbanColumnId !== column.id) return false;
                    const createdAt = new Date(t.created_at);
                    return createdAt >= weekStart && createdAt < weekEnd;
                }).length;

                return { columnName: colName, count };
            });

            weeklyTrend.push({
                week: weekLabel,
                columns: weekColumns,
            });
        }

        return {
            repartoData,
            weeklyTrend,
            columnNames,
            productionKanbanId,
        };
    },
);

// ============================================
// FATTURAZIONE DASHBOARD DATA
// ============================================

export interface FatturazioneAgingData {
    bucket: string;
    amount: number;
    count: number;
}

export interface FatturazioneWeeklyData {
    week: string;
    incassi: number;
    emesso: number;
}

export interface FatturazioneDashboardStats {
    agingData: FatturazioneAgingData[];
    weeklyTrend: FatturazioneWeeklyData[];
    invoiceKanbanId: number | null;
}

export const fetchFatturazioneDashboardData = cache(
    async (siteId: string): Promise<FatturazioneDashboardStats> => {
        const supabase = await createClient();

        const now = new Date();

        // Fetch invoice tasks (task_type = 'FATTURA' or from invoice kanban)
        const kanbansResult = await supabase
            .from("Kanban")
            .select("id, title, identifier, is_invoice_kanban")
            .eq("site_id", siteId);

        const allKanbans = kanbansResult.data || [];

        // Find invoice kanban
        const invoiceKanbans = allKanbans.filter((k) => {
            if (k.is_invoice_kanban) return true;
            const name = (k.title || k.identifier || "").toLowerCase();
            return (
                name.includes("fattura") ||
                name.includes("invoice") ||
                name.includes("fatturazione")
            );
        });

        const invoiceKanban = invoiceKanbans[0];
        const invoiceKanbanId = invoiceKanban?.id || null;

        // Fetch invoice tasks
        const tasksResult = await supabase
            .from("Task")
            .select(
                `
                id,
                unique_code,
                task_type,
                sellPrice,
                deliveryDate,
                created_at,
                updated_at,
                archived,
                kanbanId,
                display_mode
            `,
            )
            .eq("site_id", siteId)
            .eq("archived", false);

        const allTasks = tasksResult.data || [];

        // Filter invoice tasks
        const invoiceKanbanIds = new Set(invoiceKanbans.map((k) => k.id));
        const invoices = allTasks.filter(
            (task: any) =>
                task.task_type === "FATTURA" ||
                invoiceKanbanIds.has(task.kanbanId),
        );

        // Separate open vs paid invoices (paid = display_mode green or archived)
        const openInvoices = invoices.filter(
            (inv: any) => inv.display_mode !== "small_green" && !inv.archived,
        );

        // 1. Aging fatture (buckets: 0-30, 31-60, 61-90, 90+)
        const agingBuckets = [
            { bucket: "0-30", min: 0, max: 30, amount: 0, count: 0 },
            { bucket: "31-60", min: 31, max: 60, amount: 0, count: 0 },
            { bucket: "61-90", min: 61, max: 90, amount: 0, count: 0 },
            { bucket: "90+", min: 91, max: Infinity, amount: 0, count: 0 },
        ];

        openInvoices.forEach((inv: any) => {
            if (!inv.deliveryDate) return;
            const dueDate = new Date(inv.deliveryDate);
            const daysOverdue = Math.max(
                0,
                Math.floor(
                    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
                ),
            );

            const bucket = agingBuckets.find(
                (b) => daysOverdue >= b.min && daysOverdue <= b.max,
            );
            if (bucket) {
                bucket.amount += inv.sellPrice || 0;
                bucket.count += 1;
            }
        });

        const agingData: FatturazioneAgingData[] = agingBuckets.map((b) => ({
            bucket: b.bucket,
            amount: b.amount,
            count: b.count,
        }));

        // 2. Incassi per settimana (last 4 weeks)
        // Using paid invoices (display_mode = small_green) created_at or updated_at
        const paidInvoices = invoices.filter(
            (inv: any) => inv.display_mode === "small_green",
        );

        const weeklyTrend: FatturazioneWeeklyData[] = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - i * 7 - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            const weekLabel = `Sett. ${4 - i}`;

            // Incassi: paid invoices in this week
            const incassi = paidInvoices
                .filter((inv: any) => {
                    const paidDate = new Date(inv.updated_at || inv.created_at);
                    return paidDate >= weekStart && paidDate < weekEnd;
                })
                .reduce(
                    (sum: number, inv: any) => sum + (inv.sellPrice || 0),
                    0,
                );

            // Emesso: all invoices created this week
            const emesso = invoices
                .filter((inv: any) => {
                    const createdAt = new Date(inv.created_at);
                    return createdAt >= weekStart && createdAt < weekEnd;
                })
                .reduce(
                    (sum: number, inv: any) => sum + (inv.sellPrice || 0),
                    0,
                );

            weeklyTrend.push({
                week: weekLabel,
                incassi,
                emesso,
            });
        }

        return {
            agingData,
            weeklyTrend,
            invoiceKanbanId,
        };
    },
);

// ============================================
// LAVORI INTERNI DASHBOARD DATA
// ============================================

export interface InterniCategoriaData {
    categoria: string;
    ore: number;
}

export interface InterniWeeklyData {
    week: string;
    oreInterne: number;
}

export interface InterniDashboardStats {
    categoriaData: InterniCategoriaData[];
    weeklyTrend: InterniWeeklyData[];
}

export const fetchInterniDashboardData = cache(
    async (siteId: string): Promise<InterniDashboardStats> => {
        const supabase = await createClient();

        const now = new Date();
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(now.getDate() - 28);

        // Fetch internal time tracking entries
        const [timetrackingResult, activitiesResult] = await Promise.all([
            supabase
                .from("Timetracking")
                .select(
                    `
                    id,
                    hours,
                    minutes,
                    totalTime,
                    activity_type,
                    internal_activity,
                    created_at
                `,
                )
                .eq("site_id", siteId)
                .eq("activity_type", "internal")
                .gte("created_at", fourWeeksAgo.toISOString()),
            supabase
                .from("internal_activities")
                .select("id, code, label")
                .or(`site_id.eq.${siteId},site_id.is.null`),
        ]);

        const timeEntries = timetrackingResult.data || [];
        const activities = activitiesResult.data || [];

        // Create activity label map
        const activityMap = new Map(activities.map((a) => [a.code, a.label]));

        // 1. Ore per categoria
        const categoryHours = new Map<string, number>();

        timeEntries.forEach((entry: any) => {
            const code = entry.internal_activity || "altro";
            const label = activityMap.get(code) || code;
            const hours = entry.totalTime ||
                entry.hours + (entry.minutes || 0) / 60;

            categoryHours.set(label, (categoryHours.get(label) || 0) + hours);
        });

        const categoriaData: InterniCategoriaData[] = Array.from(
            categoryHours.entries(),
        )
            .map(([categoria, ore]) => ({
                categoria,
                ore: Math.round(ore * 10) / 10,
            }))
            .sort((a, b) => b.ore - a.ore);

        // 2. Trend settimanale (last 4 weeks)
        const weeklyTrend: InterniWeeklyData[] = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - i * 7 - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            const weekLabel = `Sett. ${4 - i}`;

            const oreInterne = timeEntries
                .filter((entry: any) => {
                    const createdAt = new Date(entry.created_at);
                    return createdAt >= weekStart && createdAt < weekEnd;
                })
                .reduce((sum: number, entry: any) => {
                    const hours = entry.totalTime ||
                        entry.hours + (entry.minutes || 0) / 60;
                    return sum + hours;
                }, 0);

            weeklyTrend.push({
                week: weekLabel,
                oreInterne: Math.round(oreInterne * 10) / 10,
            });
        }

        return {
            categoriaData,
            weeklyTrend,
        };
    },
);

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

// ============================================
// INVENTORY DASHBOARD DATA
// ============================================

export interface InventoryDashboardAlert {
    id: string;
    variantId?: string;
    message: string;
    type: "negative_qty" | "missing_cost" | "missing_category" | "low_stock";
    priority: "high" | "medium" | "low";
    itemName?: string;
    categoryName?: string;
}

export interface InventoryDashboardStats {
    // KPI data
    totalInventoryValue: number;
    availableValue: number;
    activeItemsCount: number;
    lowStockCount: number;
    // Value by category
    valueByCategory: Array<{
        category: string;
        categoryId?: string;
        value: number;
    }>;
    // Value trend (weekly)
    valueTrend: Array<{
        week: string;
        value: number;
        movementCount: number;
    }>;
    // Top items by value
    topItems: Array<{
        id: string;
        variantId: string;
        name: string;
        category: string;
        categoryId?: string;
        quantity: number;
        unitCost: number;
        totalValue: number;
        lastUpdate: string;
    }>;
    // Alerts
    alerts: InventoryDashboardAlert[];
}

export const fetchInventoryDashboardData = cache(
    async (siteId: string): Promise<InventoryDashboardStats> => {
        const supabase = await createClient();

        // Fetch all inventory data in parallel
        const [itemsResult, stockResult, movementsResult, categoriesResult] =
            await Promise.all([
                supabase
                    .from("inventory_items")
                    .select(
                        `
                    *,
                    category:inventory_categories(*),
                    variants:inventory_item_variants(
                        *,
                        unit:inventory_units(*)
                    )
                `,
                    )
                    .eq("site_id", siteId)
                    .eq("is_active", true),
                supabase
                    .from("inventory_stock")
                    .select("*")
                    .eq("site_id", siteId),
                supabase
                    .from("inventory_stock_movements")
                    .select("*")
                    .eq("site_id", siteId)
                    .order("occurred_at", { ascending: false }),
                supabase
                    .from("inventory_categories")
                    .select("*")
                    .eq("site_id", siteId),
            ]);

        const items = itemsResult.data || [];
        const stock = stockResult.data || [];
        const movements = movementsResult.data || [];
        const categories = categoriesResult.data || [];

        // Create stock lookup map (variant_id -> total quantity)
        const stockMap = new Map<string, number>();
        stock.forEach((s: any) => {
            const currentQty = stockMap.get(s.variant_id) || 0;
            stockMap.set(s.variant_id, currentQty + (s.quantity || 0));
        });

        // Create category lookup
        const categoryMap = new Map<string, any>();
        categories.forEach((cat: any) => {
            categoryMap.set(cat.id, cat);
        });

        // Flatten items with variants and calculate values
        const inventoryItems: any[] = [];
        const alerts: InventoryDashboardAlert[] = [];
        let totalInventoryValue = 0;
        let activeItemsCount = 0;
        let lowStockCount = 0;
        const valueByCategoryMap = new Map<
            string,
            { value: number; categoryId?: string }
        >();

        items.forEach((item: any) => {
            const variants = item.variants || [];
            const categoryName = item.category?.name || "Senza categoria";
            const categoryId = item.category?.id;

            variants.forEach((variant: any) => {
                const quantity = stockMap.get(variant.id) || 0;
                const unitCost = variant.purchase_unit_price || 0;
                const itemValue = quantity * unitCost;

                inventoryItems.push({
                    id: item.id,
                    variantId: variant.id,
                    name: item.name,
                    category: categoryName,
                    categoryId,
                    quantity,
                    unitCost,
                    totalValue: itemValue,
                    lastUpdate: variant.updated_at || item.updated_at || "",
                });

                totalInventoryValue += itemValue;
                if (quantity > 0) {
                    activeItemsCount++;
                }

                // Accumulate value by category
                const catValue = valueByCategoryMap.get(categoryName) || {
                    value: 0,
                    categoryId,
                };
                catValue.value += itemValue;
                valueByCategoryMap.set(categoryName, catValue);

                // Check for alerts
                if (quantity < 0) {
                    alerts.push({
                        id: `neg-${variant.id}`,
                        variantId: variant.id,
                        message:
                            `"${item.name}" ha quantità negativa (${quantity})`,
                        type: "negative_qty",
                        priority: "high",
                        itemName: item.name,
                        categoryName,
                    });
                }

                if (!unitCost || unitCost === 0) {
                    alerts.push({
                        id: `cost-${variant.id}`,
                        variantId: variant.id,
                        message: `"${item.name}" non ha costo unitario`,
                        type: "missing_cost",
                        priority: "medium",
                        itemName: item.name,
                        categoryName,
                    });
                }

                if (!item.category_id) {
                    alerts.push({
                        id: `cat-${item.id}`,
                        variantId: variant.id,
                        message: `"${item.name}" non ha categoria assegnata`,
                        type: "missing_category",
                        priority: "low",
                        itemName: item.name,
                    });
                }

                // TODO: Check for low stock when min_qty field is available
                // if (variant.min_qty && quantity < variant.min_qty) {
                //     lowStockCount++;
                //     alerts.push({
                //         id: `low-${variant.id}`,
                //         variantId: variant.id,
                //         message: `"${item.name}" sotto scorta minima (${quantity}/${variant.min_qty})`,
                //         type: "low_stock",
                //         priority: "high",
                //         itemName: item.name,
                //         categoryName,
                //     });
                // }
            });
        });

        // Convert category values to array and sort
        const valueByCategory = Array.from(valueByCategoryMap.entries())
            .map(([category, data]) => ({
                category,
                categoryId: data.categoryId,
                value: data.value,
            }))
            .sort((a, b) => b.value - a.value);

        // Calculate weekly value trend from movements
        const now = new Date();
        const weeklyTrendMap = new Map<
            string,
            { value: number; movementCount: number }
        >();

        // Initialize last 8 weeks
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - i * 7);
            const weekKey = `W${weekStart.toISOString().slice(0, 10)}`;
            weeklyTrendMap.set(weekKey, { value: 0, movementCount: 0 });
        }

        // Count movements per week
        movements.forEach((m: any) => {
            const mDate = new Date(m.occurred_at);
            const weeksDiff = Math.floor(
                (now.getTime() - mDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
            );
            if (weeksDiff >= 0 && weeksDiff < 8) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - weeksDiff * 7);
                const weekKey = `W${weekStart.toISOString().slice(0, 10)}`;
                const current = weeklyTrendMap.get(weekKey) || {
                    value: 0,
                    movementCount: 0,
                };
                current.movementCount++;
                weeklyTrendMap.set(weekKey, current);
            }
        });

        const valueTrend = Array.from(weeklyTrendMap.entries()).map(
            ([week, data]) => ({
                week: week.replace("W", "Sett. ").slice(0, 15),
                value: totalInventoryValue, // Simplified: shows current value for all weeks
                movementCount: data.movementCount,
            }),
        );

        // Sort top items by value and take top 30
        const topItems = inventoryItems
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 30);

        // Limit alerts to 10
        const limitedAlerts = alerts.slice(0, 10);

        return {
            totalInventoryValue,
            availableValue: totalInventoryValue, // No reserved qty implemented yet
            activeItemsCount,
            lowStockCount,
            valueByCategory,
            valueTrend,
            topItems,
            alerts: limitedAlerts,
        };
    },
);

// ============================================
// PRODUCTS DASHBOARD DATA
// ============================================

export interface ProductsDashboardAlert {
    id: number | string;
    message: string;
    type: "missing_price" | "missing_category" | "missing_production_qty";
    priority: "high" | "medium" | "low";
    productName?: string;
}

export interface ProductsDashboardStats {
    // Resale products KPIs
    resale: {
        availableProducts: number;
        activeCategories: number;
        productsWithoutCategory: number;
        productsByCategory: Array<{
            category: string;
            categoryId?: number;
            count: number;
            color?: string;
        }>;
        products: Array<{
            id: number;
            name: string;
            category: string;
            categoryId?: number;
            sku?: string;
            active: boolean;
        }>;
    };
    // Production (factory) KPIs
    production: {
        totalElementsProduced: number;
        avgElementsPerWeek: number;
        elementsByWeek: Array<{
            week: string;
            elements: number;
        }>;
        elementsByCategory: Array<{
            category: string;
            categoryId?: number;
            elements: number;
            color?: string;
        }>;
    };
    // Alerts
    alerts: ProductsDashboardAlert[];
}

export const fetchProductsDashboardData = cache(
    async (siteId: string): Promise<ProductsDashboardStats> => {
        const supabase = await createClient();

        // Fetch sell products and production tasks in parallel
        const [productsResult, categoriesResult, tasksResult] = await Promise
            .all([
                supabase
                    .from("SellProduct")
                    .select("*, category:category_id(id, name, color)")
                    .eq("site_id", siteId),
                supabase
                    .from("sellproduct_categories")
                    .select("*")
                    .eq("site_id", siteId),
                supabase
                    .from("Task")
                    .select(
                        `
                    id,
                    name,
                    numero_pezzi,
                    created_at,
                    updated_at,
                    archived,
                    task_type,
                    SellProduct:sellProductId(id, name, category:category_id(id, name, color))
                `,
                    )
                    .eq("site_id", siteId)
                    .eq("archived", false),
            ]);

        const products = productsResult.data || [];
        const categories = categoriesResult.data || [];
        const tasks = tasksResult.data || [];
        const alerts: ProductsDashboardAlert[] = [];

        // ============================================
        // RESALE PRODUCTS ANALYSIS
        // ============================================

        // Filter active resale products
        const activeProducts = products.filter((p: any) => p.active === true);
        const productsWithoutCategory = activeProducts.filter(
            (p: any) => !p.category_id,
        );

        // Count products by category
        const productsByCategoryMap = new Map<
            string,
            { count: number; categoryId?: number; color?: string }
        >();

        activeProducts.forEach((product: any) => {
            const categoryName = product.category?.name || "Senza categoria";
            const categoryId = product.category?.id;
            const categoryColor = product.category?.color;

            const current = productsByCategoryMap.get(categoryName) || {
                count: 0,
                categoryId,
                color: categoryColor,
            };
            current.count++;
            productsByCategoryMap.set(categoryName, current);
        });

        const productsByCategory = Array.from(productsByCategoryMap.entries())
            .map(([category, data]) => ({
                category,
                categoryId: data.categoryId,
                count: data.count,
                color: data.color,
            }))
            .sort((a, b) => b.count - a.count);

        // Get unique active categories count
        const activeCategoryIds = new Set(
            activeProducts
                .filter((p: any) => p.category_id)
                .map((p: any) => p.category_id),
        );

        // Map products for table
        const resaleProducts = activeProducts.map((p: any) => ({
            id: p.id,
            name: p.name || "",
            category: p.category?.name || "Senza categoria",
            categoryId: p.category?.id,
            sku: p.internal_code || "",
            active: p.active === true,
        }));

        // ============================================
        // PRODUCTION ANALYSIS
        // ============================================

        // Filter production tasks (LAVORO type or with numero_pezzi)
        const productionTasks = tasks.filter(
            (t: any) => t.task_type === "LAVORO" || t.numero_pezzi,
        );

        // Calculate total elements produced
        let totalElementsProduced = 0;
        const elementsByWeekMap = new Map<string, number>();
        const elementsByCategoryMap = new Map<
            string,
            { elements: number; categoryId?: number; color?: string }
        >();

        // Initialize last 8 weeks
        const now = new Date();
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - i * 7);
            const weekKey = `W${weekStart.toISOString().slice(0, 10)}`;
            elementsByWeekMap.set(weekKey, 0);
        }

        productionTasks.forEach((task: any) => {
            const elements = task.numero_pezzi || 1; // Default to 1 if not set
            totalElementsProduced += elements;

            // Group by week
            const taskDate = new Date(task.created_at || task.updated_at);
            const weeksDiff = Math.floor(
                (now.getTime() - taskDate.getTime()) /
                    (7 * 24 * 60 * 60 * 1000),
            );
            if (weeksDiff >= 0 && weeksDiff < 8) {
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - weeksDiff * 7);
                const weekKey = `W${weekStart.toISOString().slice(0, 10)}`;
                const current = elementsByWeekMap.get(weekKey) || 0;
                elementsByWeekMap.set(weekKey, current + elements);
            }

            // Group by category
            const categoryName = task.SellProduct?.category?.name ||
                "Senza categoria";
            const categoryId = task.SellProduct?.category?.id;
            const categoryColor = task.SellProduct?.category?.color;

            const catData = elementsByCategoryMap.get(categoryName) || {
                elements: 0,
                categoryId,
                color: categoryColor,
            };
            catData.elements += elements;
            elementsByCategoryMap.set(categoryName, catData);

            // Check for missing production qty alert
            if (!task.numero_pezzi) {
                alerts.push({
                    id: task.id,
                    message: `Commessa "${
                        task.name || task.id
                    }" senza numero pezzi specificato`,
                    type: "missing_production_qty",
                    priority: "low",
                    productName: task.name,
                });
            }
        });

        const elementsByWeek = Array.from(elementsByWeekMap.entries()).map(
            ([week, elements]) => ({
                week: week.replace("W", "Sett. ").slice(0, 15),
                elements,
            }),
        );

        const elementsByCategory = Array.from(elementsByCategoryMap.entries())
            .map(([category, data]) => ({
                category,
                categoryId: data.categoryId,
                elements: data.elements,
                color: data.color,
            }))
            .sort((a, b) => b.elements - a.elements);

        // Calculate average elements per week
        const weeksWithProduction = elementsByWeek.filter(
            (w) => w.elements > 0,
        ).length;
        const avgElementsPerWeek = weeksWithProduction > 0
            ? Math.round(totalElementsProduced / weeksWithProduction)
            : 0;

        // ============================================
        // ALERTS
        // ============================================

        // Products without category
        productsWithoutCategory.forEach((p: any) => {
            alerts.push({
                id: p.id,
                message: `Prodotto "${p.name}" senza categoria`,
                type: "missing_category",
                priority: "medium",
                productName: p.name,
            });
        });

        // Limit alerts to 10
        const limitedAlerts = alerts.slice(0, 10);

        return {
            resale: {
                availableProducts: activeProducts.length,
                activeCategories: activeCategoryIds.size,
                productsWithoutCategory: productsWithoutCategory.length,
                productsByCategory,
                products: resaleProducts,
            },
            production: {
                totalElementsProduced,
                avgElementsPerWeek,
                elementsByWeek,
                elementsByCategory,
            },
            alerts: limitedAlerts,
        };
    },
);
