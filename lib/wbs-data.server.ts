// Keep this file server-only: it imports `@/utils/supabase/server` which
// relies on `next/headers`. Client-safe types live in `lib/wbs-data.ts`.
import { createClient } from "@/utils/supabase/server";
import { cache } from "react";
import { getEnabledModuleNames } from "@/lib/server-data";
import {
    getFlowchartSelectableModules,
    resolveSelectedKanbanBoardIds,
    type FlowchartKanbanCategorySelection,
    type FlowchartRoot,
} from "./flowchart-settings";
import type {
    WbsCategoryKey,
    WbsCategoryNode,
    WbsLeaf,
    WbsModuleNode,
    WbsTree,
} from "./wbs-data";

const CATEGORY_LABELS: Record<WbsCategoryKey, string> = {
    core: "Principale",
    management: "Gestione",
    tools: "Strumenti",
    reports: "Report",
};

const CATEGORY_ORDER: WbsCategoryKey[] = [
    "core",
    "management",
    "tools",
    "reports",
];

function getInitials(label: string): string {
    return label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "?";
}

function countLeaf(
    moduleName: string,
    count: number | null | undefined,
    singular: string,
    plural: string,
): WbsLeaf[] {
    const value = count ?? 0;
    return [{
        id: `${moduleName}-count`,
        label: `${value} ${value === 1 ? singular : plural}`,
    }];
}

/**
 * Heuristic icon (kanban lucide library) for inventory categories, which have
 * no icon column in the DB. Matched on the category name.
 */
function inventoryCategoryIcon(name: string): string {
    const normalized = name.toLowerCase();
    if (/legn/.test(normalized)) return "TreeDeciduous";
    if (/utensil|attrezz/.test(normalized)) return "Wrench";
    if (/macchin/.test(normalized)) return "Drill";
    if (/ferrament/.test(normalized)) return "Hammer";
    if (/pannell/.test(normalized)) return "Layers";
    if (/bord/.test(normalized)) return "Ruler";
    return "Box";
}

/**
 * Fallback icon (kanban lucide library) for product / project categories that
 * have no icon set in the DB. Matched on the category name; the DB icon, when
 * present, always takes precedence.
 */
function productCategoryIcon(name: string): string {
    const normalized = name.toLowerCase();
    if (/arredament|mobil/.test(normalized)) return "Sofa";
    if (/port/.test(normalized)) return "KeyRound";
    if (/serrament|finestr/.test(normalized)) return "Ruler";
    if (/accessor/.test(normalized)) return "Package";
    if (/ferrament/.test(normalized)) return "Hammer";
    if (/posa|montagg|install/.test(normalized)) return "Hammer";
    if (/service|assistenz|manutenz/.test(normalized)) return "Wrench";
    if (/var/.test(normalized)) return "Boxes";
    return "Box";
}

/**
 * Fetches level-3 content (counters / named records) for the modules that
 * appear in the tree. Each query is independent and failures never break
 * the diagram (the module simply shows no content leaves).
 */
interface ModuleContents {
    leaves: Record<string, WbsLeaf[]>;
    counts: Record<string, number>;
}

async function fetchModuleContents(
    siteId: string,
    moduleNames: Set<string>,
    kanbanSelection: FlowchartKanbanCategorySelection[] | null,
    legacyKanbanIds: string[] | null,
): Promise<ModuleContents> {
    const supabase = await createClient();
    const leaves: Record<string, WbsLeaf[]> = {};
    const counts: Record<string, number> = {};

    const countQuery = (table: string) =>
        supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("site_id", siteId);

    // Supabase query builders are PromiseLike, not full Promises.
    const tasks: PromiseLike<void>[] = [];

    if (moduleNames.has("kanban")) {
        tasks.push(
            (async () => {
                const [boardsResult, tasksResult] = await Promise.all([
                    supabase
                        .from("Kanban")
                        .select(
                            "id, title, identifier, category_id, category:KanbanCategory(id, name, identifier, display_order, color, icon), columns:KanbanColumn(id, title, position)",
                        )
                        .eq("site_id", siteId),
                    supabase
                        .from("Task")
                        .select("kanbanColumnId, sellPrice, numero_pezzi")
                        .eq("site_id", siteId)
                        .eq("archived", false),
                ]);

                type CategoryRel = {
                    id: number;
                    name: string | null;
                    identifier: string | null;
                    display_order: number | null;
                    color: string | null;
                    icon: string | null;
                };
                type BoardRow = {
                    id: number;
                    title: string | null;
                    identifier: string | null;
                    category_id?: number | null;
                    category: CategoryRel | CategoryRel[] | null;
                    columns:
                        | {
                            id: number;
                            title: string | null;
                            position: number | null;
                        }[]
                        | null;
                };

                const allBoards = (boardsResult.data ?? []) as BoardRow[];
                const boardRefs = allBoards.map((board) => {
                    const category = Array.isArray(board.category)
                        ? board.category[0] ?? null
                        : board.category;
                    return {
                        id: board.id,
                        categoryId: category?.id != null
                            ? String(category.id)
                            : board.category_id != null
                            ? String(board.category_id)
                            : null,
                    };
                });
                const selectedBoardIds = resolveSelectedKanbanBoardIds(
                    boardRefs,
                    kanbanSelection,
                    legacyKanbanIds,
                );
                const boards = selectedBoardIds
                    ? allBoards.filter((board) =>
                        selectedBoardIds.has(String(board.id))
                    )
                    : allBoards;
                counts.kanban = boards.length;

                // Tasks count, pieces and sellPrice sums per kanban column.
                const columnStats = new Map<
                    number,
                    { count: number; pieces: number; sum: number }
                >();
                for (
                    const task of (tasksResult.data ?? []) as {
                        kanbanColumnId: number | null;
                        sellPrice: number | null;
                        numero_pezzi: number | null;
                    }[]
                ) {
                    if (task.kanbanColumnId == null) continue;
                    const entry = columnStats.get(task.kanbanColumnId) ??
                        { count: 0, pieces: 0, sum: 0 };
                    entry.count += 1;
                    entry.pieces += task.numero_pezzi ?? 0;
                    entry.sum += task.sellPrice ?? 0;
                    columnStats.set(task.kanbanColumnId, entry);
                }

                const chf = new Intl.NumberFormat("it-CH", {
                    maximumFractionDigits: 0,
                });

                // Group boards by kanban category (main categories as leaves),
                // ordered like the sidebar (display_order, then name).
                const categories = new Map<
                    string,
                    {
                        name: string;
                        identifier: string | null;
                        displayOrder: number;
                        color: string | null;
                        icon: string | null;
                        boards: BoardRow[];
                    }
                >();
                for (const board of boards) {
                    const category = Array.isArray(board.category)
                        ? board.category[0] ?? null
                        : board.category;
                    const key = category?.id != null
                        ? String(category.id)
                        : "none";
                    const group = categories.get(key) ?? {
                        name: category?.name || "Senza categoria",
                        identifier: category?.identifier ?? null,
                        displayOrder: category?.display_order ??
                            Number.MAX_SAFE_INTEGER,
                        color: category?.color ?? null,
                        icon: category?.icon ?? null,
                        boards: [],
                    };
                    group.boards.push(board);
                    categories.set(key, group);
                }

                const categoryLeaves: WbsLeaf[] = Array.from(
                    categories.entries(),
                )
                    .sort(([, a], [, b]) =>
                        a.displayOrder - b.displayOrder ||
                        a.name.localeCompare(b.name, "it")
                    )
                    .map(([key, group]) => {
                    // Deep link to the first board of the category, mirroring
                    // the sidebar route (name + optional category identifier).
                    const firstBoard = group.boards[0];
                    const href = firstBoard?.identifier
                        ? group.identifier
                            ? `/kanban?name=${firstBoard.identifier}&category=${group.identifier}`
                            : `/kanban?name=${firstBoard.identifier}`
                        : "/kanban";

                    return {
                    id: `kanban-cat-${key}`,
                    label: group.name,
                    badge: String(group.boards.length),
                    color: group.color ?? undefined,
                    icon: group.icon ?? undefined,
                    href,
                    detail: {
                        title: `Kanban — ${group.name}`,
                        sections: group.boards.map((board) => {
                            const orderedColumns = [...(board.columns ?? [])]
                                .sort((a, b) =>
                                    (a.position ?? 0) - (b.position ?? 0)
                                );

                            return {
                                title: board.title || "Kanban",
                                rows: orderedColumns.map((column) => {
                                    const stats =
                                        columnStats.get(column.id) ??
                                            { count: 0, pieces: 0, sum: 0 };
                                    return {
                                        label: column.title || "Colonna",
                                        value: stats.sum > 0
                                            ? `${stats.count} task · CHF ${
                                                chf.format(stats.sum)
                                            }`
                                            : `${stats.count} task`,
                                    };
                                }),
                                chart: orderedColumns.map((column) => {
                                    const stats =
                                        columnStats.get(column.id) ??
                                            { count: 0, pieces: 0, sum: 0 };
                                    return {
                                        label: column.title || "Colonna",
                                        tasks: stats.count,
                                        pieces: stats.pieces,
                                        value: stats.sum,
                                    };
                                }),
                            };
                        }),
                    },
                    };
                });

                leaves.kanban = categoryLeaves.length > 0 ? categoryLeaves : [{
                    id: "kanban-count",
                    label: "0 bacheche",
                }];
            })(),
        );
    }

    const countConfigs: Array<{
        module: string;
        table: string;
        singular: string;
        plural: string;
    }> = [
        { module: "suppliers", table: "Supplier", singular: "fornitore", plural: "fornitori" },
        { module: "manufacturers", table: "Manufacturer", singular: "produttore", plural: "produttori" },
        { module: "timetracking", table: "Timetracking", singular: "registrazione", plural: "registrazioni" },
        { module: "qualitycontrol", table: "QualityControl", singular: "controllo", plural: "controlli" },
        { module: "boxing", table: "PackingControl", singular: "imballaggio", plural: "imballaggi" },
        { module: "errortracking", table: "Errortracking", singular: "errore", plural: "errori" },
    ];

    for (const config of countConfigs) {
        if (!moduleNames.has(config.module)) continue;
        tasks.push(
            countQuery(config.table).then(({ count }) => {
                counts[config.module] = count ?? 0;
                leaves[config.module] = countLeaf(
                    config.module,
                    count,
                    config.singular,
                    config.plural,
                );
            }),
        );
    }

    // Projects grouped by sell-product category (Arredamento, Porte, ...).
    if (moduleNames.has("projects")) {
        tasks.push(
            (async () => {
                const { data } = await supabase
                    .from("Task")
                    .select(
                        "id, sellProduct:SellProduct!sellProductId(category:sellproduct_categories(id, name, sort_order, color, icon))",
                    )
                    .eq("site_id", siteId)
                    .eq("archived", false);

                type TaskCategory = {
                    id: number;
                    name: string | null;
                    sort_order: number | null;
                    color: string | null;
                    icon: string | null;
                };
                type TaskRow = {
                    id: number;
                    sellProduct:
                        | { category: TaskCategory | TaskCategory[] | null }
                        | { category: TaskCategory | TaskCategory[] | null }[]
                        | null;
                };

                const rows = (data ?? []) as TaskRow[];
                counts.projects = rows.length;

                const groups = new Map<
                    string,
                    {
                        name: string;
                        sortOrder: number;
                        color: string | null;
                        icon: string | null;
                        count: number;
                    }
                >();
                for (const row of rows) {
                    const product = Array.isArray(row.sellProduct)
                        ? row.sellProduct[0] ?? null
                        : row.sellProduct;
                    const category = Array.isArray(product?.category)
                        ? product?.category[0] ?? null
                        : product?.category ?? null;

                    const key = category?.id != null
                        ? String(category.id)
                        : "none";
                    const group = groups.get(key) ?? {
                        name: category?.name || "Senza categoria",
                        sortOrder: category?.sort_order ??
                            Number.MAX_SAFE_INTEGER,
                        color: category?.color ?? null,
                        icon: category?.icon ?? null,
                        count: 0,
                    };
                    group.count += 1;
                    groups.set(key, group);
                }

                leaves.projects = Array.from(groups.entries())
                    .sort(([, a], [, b]) =>
                        a.sortOrder - b.sortOrder ||
                        a.name.localeCompare(b.name, "it")
                    )
                    .map(([key, group]) => ({
                        id: `projects-cat-${key}`,
                        label: group.name,
                        badge: String(group.count),
                        color: group.color ?? undefined,
                        icon: group.icon ??
                            (key === "none"
                                ? "Folder"
                                : productCategoryIcon(group.name)),
                    }));

                if (leaves.projects.length === 0) {
                    leaves.projects = countLeaf(
                        "projects",
                        0,
                        "progetto",
                        "progetti",
                    );
                }
            })(),
        );
    }

    // Clients grouped by type (private individuals vs companies).
    if (moduleNames.has("clients")) {
        tasks.push(
            (async () => {
                const { data } = await supabase
                    .from("Client")
                    .select("clientType")
                    .eq("site_id", siteId);

                const rows = (data ?? []) as {
                    clientType: string | null;
                }[];
                counts.clients = rows.length;

                const individuals = rows.filter(
                    (row) => row.clientType === "INDIVIDUAL",
                ).length;
                const businesses = rows.length - individuals;

                const clientLeaves: WbsLeaf[] = [];
                if (individuals > 0) {
                    clientLeaves.push({
                        id: "clients-individual",
                        label: "Privati",
                        badge: String(individuals),
                        icon: "CircleUser",
                    });
                }
                if (businesses > 0) {
                    clientLeaves.push({
                        id: "clients-business",
                        label: "Aziende",
                        badge: String(businesses),
                        icon: "Factory",
                    });
                }

                leaves.clients = clientLeaves.length > 0
                    ? clientLeaves
                    : countLeaf("clients", 0, "cliente", "clienti");
            })(),
        );
    }

    // Inventory grouped by inventory category (Legname, Bordi, ...).
    if (moduleNames.has("inventory")) {
        tasks.push(
            (async () => {
                const [itemsResult, categoriesResult] = await Promise.all([
                    supabase
                        .from("inventory_items")
                        .select("id, category_id")
                        .eq("site_id", siteId)
                        .eq("is_active", true),
                    supabase
                        .from("inventory_categories")
                        .select("id, name, sort_order")
                        .eq("site_id", siteId),
                ]);

                const items = (itemsResult.data ?? []) as {
                    id: string;
                    category_id: string | null;
                }[];
                const categoryRows = (categoriesResult.data ?? []) as {
                    id: string;
                    name: string | null;
                    sort_order: number | null;
                }[];

                counts.inventory = items.length;

                const categoryMeta = new Map(
                    categoryRows.map((category) => [
                        category.id,
                        {
                            name: category.name || "Categoria",
                            sortOrder: category.sort_order ??
                                Number.MAX_SAFE_INTEGER,
                        },
                    ]),
                );

                const groups = new Map<
                    string,
                    { name: string; sortOrder: number; count: number }
                >();
                for (const item of items) {
                    const key = item.category_id ?? "none";
                    const meta = item.category_id
                        ? categoryMeta.get(item.category_id)
                        : undefined;
                    const group = groups.get(key) ?? {
                        name: meta?.name || "Senza categoria",
                        sortOrder: meta?.sortOrder ?? Number.MAX_SAFE_INTEGER,
                        count: 0,
                    };
                    group.count += 1;
                    groups.set(key, group);
                }

                leaves.inventory = Array.from(groups.entries())
                    .sort(([, a], [, b]) =>
                        a.sortOrder - b.sortOrder ||
                        a.name.localeCompare(b.name, "it")
                    )
                    .map(([key, group]) => ({
                        id: `inventory-cat-${key}`,
                        label: group.name,
                        badge: String(group.count),
                        icon: key === "none"
                            ? "Folder"
                            : inventoryCategoryIcon(group.name),
                    }));

                if (leaves.inventory.length === 0) {
                    leaves.inventory = countLeaf(
                        "inventory",
                        0,
                        "articolo",
                        "articoli",
                    );
                }
            })(),
        );
    }

    // Products grouped by sell-product category (Arredamento, Porte, ...).
    if (moduleNames.has("products")) {
        tasks.push(
            (async () => {
                const [productsResult, categoriesResult] = await Promise.all([
                    supabase
                        .from("SellProduct")
                        .select("id, category_id")
                        .eq("site_id", siteId),
                    supabase
                        .from("sellproduct_categories")
                        .select("id, name, sort_order, color, icon")
                        .eq("site_id", siteId),
                ]);

                const products = (productsResult.data ?? []) as {
                    id: number;
                    category_id: number | null;
                }[];
                const categoryRows = (categoriesResult.data ?? []) as {
                    id: number;
                    name: string | null;
                    sort_order: number | null;
                    color: string | null;
                    icon: string | null;
                }[];

                counts.products = products.length;

                const categoryMeta = new Map(
                    categoryRows.map((category) => [
                        category.id,
                        {
                            name: category.name || "Categoria",
                            sortOrder: category.sort_order ??
                                Number.MAX_SAFE_INTEGER,
                            color: category.color ?? null,
                            icon: category.icon ?? null,
                        },
                    ]),
                );

                const groups = new Map<
                    string,
                    {
                        name: string;
                        sortOrder: number;
                        color: string | null;
                        icon: string | null;
                        count: number;
                    }
                >();
                for (const product of products) {
                    const key = product.category_id != null
                        ? String(product.category_id)
                        : "none";
                    const meta = product.category_id != null
                        ? categoryMeta.get(product.category_id)
                        : undefined;
                    const group = groups.get(key) ?? {
                        name: meta?.name || "Senza categoria",
                        sortOrder: meta?.sortOrder ?? Number.MAX_SAFE_INTEGER,
                        color: meta?.color ?? null,
                        icon: meta?.icon ?? null,
                        count: 0,
                    };
                    group.count += 1;
                    groups.set(key, group);
                }

                leaves.products = Array.from(groups.entries())
                    .sort(([, a], [, b]) =>
                        a.sortOrder - b.sortOrder ||
                        a.name.localeCompare(b.name, "it")
                    )
                    .map(([key, group]) => ({
                        id: `products-cat-${key}`,
                        label: group.name,
                        badge: String(group.count),
                        color: group.color ?? undefined,
                        icon: group.icon ??
                            (key === "none"
                                ? "Folder"
                                : productCategoryIcon(group.name)),
                    }));

                if (leaves.products.length === 0) {
                    leaves.products = countLeaf(
                        "products",
                        0,
                        "prodotto",
                        "prodotti",
                    );
                }
            })(),
        );
    }

    if (moduleNames.has("collaborators")) {
        tasks.push(
            (async () => {
                const { data: userSites } = await supabase
                    .from("user_sites")
                    .select("user_id")
                    .eq("site_id", siteId);

                const userIds = Array.from(
                    new Set(
                        (userSites ?? [])
                            .map((row) => row.user_id as string | null)
                            .filter((id): id is string => Boolean(id)),
                    ),
                );
                counts.collaborators = userIds.length;

                if (userIds.length === 0) {
                    leaves.collaborators = countLeaf(
                        "collaborators",
                        0,
                        "utente",
                        "utenti",
                    );
                    return;
                }

                const { data: users } = await supabase
                    .from("User")
                    .select(
                        "id, authId, given_name, family_name, email, picture, color",
                    )
                    .in("authId", userIds);

                type UserRow = {
                    id: number;
                    authId: string;
                    given_name: string | null;
                    family_name: string | null;
                    email: string | null;
                    picture: string | null;
                    color: string | null;
                };

                const MAX_COLLABORATOR_LEAVES = 15;
                const userRows = ((users ?? []) as UserRow[])
                    .sort((a, b) =>
                        `${a.given_name ?? ""} ${a.family_name ?? ""}`
                            .localeCompare(
                                `${b.given_name ?? ""} ${b.family_name ?? ""}`,
                                "it",
                            )
                    );

                const collaboratorLeaves: WbsLeaf[] = userRows
                    .slice(0, MAX_COLLABORATOR_LEAVES)
                    .map((user) => {
                        const fullName = [user.given_name, user.family_name]
                            .filter(Boolean)
                            .join(" ") || user.email || "Utente";
                        return {
                            id: `collab-${user.authId}`,
                            label: fullName,
                            href: `/collaborators/${user.id}`,
                            avatar: {
                                initials: getInitials(fullName),
                                imageUrl: user.picture,
                                color: user.color,
                            },
                        };
                    });

                const hidden = userRows.length - collaboratorLeaves.length;
                if (hidden > 0) {
                    collaboratorLeaves.push({
                        id: "collab-more",
                        label: `+${hidden} altri`,
                    });
                }

                leaves.collaborators = collaboratorLeaves.length > 0
                    ? collaboratorLeaves
                    : countLeaf("collaborators", 0, "utente", "utenti");
            })(),
        );
    }

    if (moduleNames.has("factory")) {
        tasks.push(
            supabase
                .from("site_settings")
                .select("setting_value")
                .eq("site_id", siteId)
                .eq("setting_key", "factory_settings")
                .maybeSingle()
                .then(({ data }) => {
                    const departments = Array.isArray(
                            (data?.setting_value as {
                                departments?: unknown[];
                            })?.departments,
                        )
                        ? (data?.setting_value as { departments: unknown[] })
                            .departments
                        : [];
                    counts.factory = departments.length;
                    leaves.factory = countLeaf(
                        "factory",
                        departments.length,
                        "reparto",
                        "reparti",
                    );
                }),
        );
    }

    const results = await Promise.allSettled(tasks);
    for (const result of results) {
        if (result.status === "rejected") {
            console.error("[wbs-data] content query failed:", result.reason);
        }
    }

    return { leaves, counts };
}

/**
 * Builds the WBS tree for the home diagram view.
 *
 * - `scope === "user"`: only the modules in `userModuleNames` (the user's
 *   permissions, already computed by the home page) appear in the tree.
 * - `scope === "site"`: all modules enabled at site level appear, giving a
 *   complete view of every area of the site.
 * - `selectedModules` / `selectedKanbanIds`: admin-configured filters
 *   (`null` = everything) further restricting what is connected to the root.
 */
export const getWbsTreeForSite = cache(
    async (params: {
        siteId: string;
        scope: FlowchartRoot;
        rootLabel: string;
        rootSublabel?: string;
        userModuleNames: string[];
        selectedModules?: string[] | null;
        kanbanSelection?: FlowchartKanbanCategorySelection[] | null;
        /** Legacy flat board filter (used when kanbanSelection is absent). */
        selectedKanbanIds?: string[] | null;
    }): Promise<WbsTree> => {
        const {
            siteId,
            scope,
            rootLabel,
            rootSublabel,
            userModuleNames,
            selectedModules = null,
            kanbanSelection = null,
            selectedKanbanIds = null,
        } = params;

        const moduleNames = scope === "site"
            ? await getEnabledModuleNames(siteId)
            : userModuleNames;
        const moduleNameSet = new Set(moduleNames);
        const selectedModuleSet = selectedModules
            ? new Set(selectedModules)
            : null;

        // Reports and dashboards are excluded from the diagram via the shared
        // selectable-modules helper.
        const visibleModules = getFlowchartSelectableModules().filter(
            (module) =>
                moduleNameSet.has(module.name) &&
                (!selectedModuleSet || selectedModuleSet.has(module.name)),
        );

        let contents: ModuleContents = { leaves: {}, counts: {} };
        try {
            contents = await fetchModuleContents(
                siteId,
                new Set(visibleModules.map((module) => module.name)),
                kanbanSelection,
                selectedKanbanIds,
            );
        } catch (error) {
            console.error("[wbs-data] failed to fetch module contents", error);
        }

        const categories: WbsCategoryNode[] = CATEGORY_ORDER
            .map((category) => {
                const modules: WbsModuleNode[] = visibleModules
                    .filter((module) => module.category === category)
                    .map((module) => {
                        const count = contents.counts[module.name];
                        return {
                            name: module.name,
                            label: module.label,
                            href: module.href,
                            icon: module.icon,
                            badge: count !== undefined
                                ? String(count)
                                : undefined,
                            items: contents.leaves[module.name] ?? [],
                        };
                    });

                return {
                    category,
                    label: CATEGORY_LABELS[category],
                    modules,
                };
            })
            .filter((node) => node.modules.length > 0);

        return {
            root: {
                kind: scope,
                label: rootLabel,
                sublabel: rootSublabel,
                initials: getInitials(rootLabel),
            },
            categories,
        };
    },
);
