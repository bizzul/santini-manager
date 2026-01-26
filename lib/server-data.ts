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
        .select("*, Client(businessName, individualFirstName, individualLastName)")
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
            Client!clientId (businessName, individualFirstName, individualLastName, zipCode, address),
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

    const siteTaskIds = (siteTasks || []).map(t => t.id);

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
        query = query.or(`site_id.eq.${siteId},task_id.in.(${siteTaskIds.join(",")})`);
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
                .select("*, column:kanbanColumnId(*), Client:clientId(businessName, individualFirstName, individualLastName)")
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

export const fetchSiteModules = cache(async (siteId: string): Promise<ModuleWithStatus[]> => {
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
        isEnabled: enabledModules.get(module.name) ?? module.enabledByDefault,
    }));
});

/**
 * Get list of enabled module names for a site
 */
export const getEnabledModuleNames = cache(async (siteId: string): Promise<string[]> => {
    const modules = await fetchSiteModules(siteId);
    return modules.filter((m) => m.isEnabled).map((m) => m.name);
});

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

        // Fetch all required data in parallel
        const [
            tasksResult,
            categoriesResult,
            usersResult,
            kanbansResult,
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
            // Kanbans with name/title for department identification
            supabase
                .from("Kanban")
                .select("id, is_offer_kanban, name, title, identifier")
                .eq("site_id", siteId),
            // Kanban columns to determine task status
            supabase
                .from("KanbanColumn")
                .select("id, kanbanId, column_type, title, position")
                .eq("site_id", siteId),
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
        const kanbans = kanbansResult.data || [];
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
            
            const name = (kanban.name || kanban.title || kanban.identifier || "").toLowerCase();
            
            // Map common kanban names to department names (more comprehensive matching)
            if (name.includes("avor") || name.includes("ufficio") || name.includes("ufficio tecnico")) return "AVOR";
            if (name.includes("vendita") || name.includes("offerta") || name.includes("commerciale")) return "Vendita";
            if (name.includes("produzione") || name.includes("prod") || name.includes("officina") || name.includes("lavorazione")) return "Prod.";
            if (name.includes("fattura") || name.includes("fatturazione") || name.includes("billing")) return "Fatturazione";
            if (name.includes("install") || name.includes("montaggio") || name.includes("cantiere")) return "Install.";
            if (name.includes("service") || name.includes("assistenza") || name.includes("manutenzione")) return "Service";
            
            // If no match, return the original name capitalized, or "Altro"
            const originalName = kanban.name || kanban.title || kanban.identifier || "";
            return originalName ? originalName.charAt(0).toUpperCase() + originalName.slice(1) : "Altro";
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
            const isOffer = task.task_type === "OFFERTA" || offerKanbanIds.has(task.kanbanId);
            if (!isOffer) return false;
            const column = columnMap.get(task.kanbanColumnId);
            const isWon = task.display_mode === "small_green" || column?.column_type === "won";
            const isLost = task.display_mode === "small_red" || column?.column_type === "lost";
            return !isWon && !isLost;
        });
        
        const activeOffersCount = activeOffersTasks.length;
        const activeOffersValue = activeOffersTasks.reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);
        
        // Calculate offer change percent (value comparison: current month vs last month)
        const currentMonthOffersValue = tasks
            .filter((task: any) => {
                const isOffer = task.task_type === "OFFERTA" || offerKanbanIds.has(task.kanbanId);
                if (!isOffer) return false;
                const taskDate = new Date(task.created_at);
                return taskDate >= startOfMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);
        
        const lastMonthOffersValue = tasks
            .filter((task: any) => {
                const isOffer = task.task_type === "OFFERTA" || offerKanbanIds.has(task.kanbanId);
                if (!isOffer) return false;
                const taskDate = new Date(task.created_at);
                return taskDate >= startOfLastMonth && taskDate <= endOfLastMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);
        
        const offerChangePercent = lastMonthOffersValue > 0 
            ? ((currentMonthOffersValue - lastMonthOffersValue) / lastMonthOffersValue) * 100 
            : 0;

        // Calculate Production Orders KPI (delayed orders)
        const delayedOrders = tasks.filter((task: any) => {
            const isOffer = task.task_type === "OFFERTA" || offerKanbanIds.has(task.kanbanId);
            if (isOffer) return false;
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            return deliveryDate < now;
        }).length;
        
        // Calculate delayed change (simplified - compare with last month)
        const lastMonthDelayed = tasks.filter((task: any) => {
            const isOffer = task.task_type === "OFFERTA" || offerKanbanIds.has(task.kanbanId);
            if (isOffer) return false;
            if (!task.deliveryDate) return false;
            const deliveryDate = new Date(task.deliveryDate);
            const taskCreated = new Date(task.created_at);
            return deliveryDate < endOfLastMonth && taskCreated <= endOfLastMonth;
        }).length;
        
        const delayedChange = lastMonthDelayed > 0 
            ? delayedOrders - lastMonthDelayed 
            : 0;

        // Calculate Open Invoices KPI
        const invoiceTasks = tasks.filter((task: any) => task.task_type === "FATTURA");
        const openInvoicesValue = invoiceTasks.reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);
        
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
                return taskDate >= startOfLastMonth && taskDate <= endOfLastMonth;
            })
            .reduce((sum: number, task: any) => sum + (task.sellPrice || 0), 0);
        
        const invoiceChangePercent = lastMonthInvoicesValue > 0 
            ? ((currentMonthInvoicesValue - lastMonthInvoicesValue) / lastMonthInvoicesValue) * 100 
            : 0;

        // Calculate AVOR Workload
        const avorKanbanIds = Array.from(kanbanMap.values())
            .filter((k) => {
                const name = (k.name || k.title || k.identifier || "").toLowerCase();
                return name.includes("avor") || name.includes("ufficio");
            })
            .map((k) => k.id);
        
        const avorTasks = tasks.filter((task: any) => avorKanbanIds.includes(task.kanbanId));
        const totalTasks = tasks.length;
        const avorPercentage = totalTasks > 0 ? (avorTasks.length / totalTasks) * 100 : 0;
        const avorStatus = avorPercentage >= 80 ? "Saturazione team" : avorPercentage >= 60 ? "Carico elevato" : "Carico normale";

        // Calculate Pipeline Data (6 months)
        const pipelineDataMap = new Map<string, number>();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(now.getMonth() - i);
            const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
            pipelineDataMap.set(monthKey, 0);
        }
        
        // Aggregate historical offer values by month
        historicalTasks.forEach((task: any) => {
            const isOffer = task.task_type === "OFFERTA" || offerKanbanIds.has(task.kanbanId);
            if (!isOffer) return;
            
            const taskDate = new Date(task.created_at);
            const monthKey = `${monthNames[taskDate.getMonth()]} ${taskDate.getFullYear().toString().slice(-2)}`;
            
            if (pipelineDataMap.has(monthKey)) {
                pipelineDataMap.set(monthKey, pipelineDataMap.get(monthKey)! + (task.sellPrice || 0));
            }
        });
        
        const pipelineData = Array.from(pipelineDataMap.entries()).map(([month, value]) => ({
            month,
            value,
        }));

        // Calculate Department Workload
        const departmentWorkloadMap = new Map<string, number>();
        tasks.forEach((task: any) => {
            const department = getDepartmentName(task.kanbanId);
            departmentWorkloadMap.set(department, (departmentWorkloadMap.get(department) || 0) + 1);
        });
        
        const departmentWorkload = Array.from(departmentWorkloadMap.entries())
            .map(([department, count]) => ({ department, count }))
            .sort((a, b) => b.count - a.count);

        // Calculate Aggregated Kanban Status
        const kanbanStatusMap = new Map<string, { status: string; count: number }>();
        
        // Map columns to status names
        const getStatusName = (column: any): string => {
            if (!column) return "Sconosciuto";
            const title = column.title?.toLowerCase() || "";
            if (title.includes("trattativa") || title.includes("negoziazione")) return "In trattativa";
            if (title.includes("lavorazione") || title.includes("lavoro")) return "In lavorazione";
            if (title.includes("corso") || title.includes("produzione")) return "In corso";
            if (title.includes("emettere") || title.includes("fattura")) return "Da emettere";
            if (title.includes("completato") || title.includes("finito")) return "Completato";
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
        const departmentStatusMap = new Map<string, { status: string; count: number }>();
        kanbanStatusMap.forEach((value, key) => {
            const department = key.split("-")[0];
            const existing = departmentStatusMap.get(department);
            if (!existing || value.count > existing.count) {
                departmentStatusMap.set(department, value);
            }
        });
        
        const kanbanStatus = Array.from(departmentStatusMap.entries())
            .map(([department, { status, count }]) => ({ department, status, count }))
            .filter((item) => ["Vendita", "AVOR", "Produzione", "Fatturazione"].includes(item.department));

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
