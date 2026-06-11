/**
 * Client-safe constants, types and pure parsers for the per-site
 * "Vista Diagramma" (home diagram view) settings.
 *
 * IMPORTANT: do NOT import anything from `@/utils/supabase/server` here —
 * this module is bundled into client components (e.g. the admin modal)
 * that only need the setting key name, the types and the value parser.
 *
 * The server-only reader (`getFlowchartSettingsForSite`) lives in
 * `lib/flowchart-settings.server.ts`.
 */
import { AVAILABLE_MODULES, type ModuleConfig } from "@/lib/module-config";

/** Key used to store/read the settings in `site_settings`. */
export const FLOWCHART_SETTING_KEY = "flowchart_settings";

export const FLOWCHART_TYPES = ["wbs", "venn", "gantt"] as const;
export type FlowchartType = (typeof FLOWCHART_TYPES)[number];

export const FLOWCHART_ROOTS = ["user", "site"] as const;
export type FlowchartRoot = (typeof FLOWCHART_ROOTS)[number];

export const FLOWCHART_NODE_STYLES = ["hybrid", "rect", "oval"] as const;
export type FlowchartNodeStyle = (typeof FLOWCHART_NODE_STYLES)[number];

/** Per-category Kanban selection for the diagram (category → boards). */
export interface FlowchartKanbanCategorySelection {
    /** Kanban category id (stringified). */
    categoryId: string;
    /**
     * Board ids within this category.
     * `null` = all boards in the category.
     */
    boardIds: string[] | null;
}

export interface SiteFlowchartSettings {
    enabled: boolean;
    type: FlowchartType;
    /** Graphical model of the nodes. */
    nodeStyle: FlowchartNodeStyle;
    /** Central category (root node) of the diagram. */
    root: FlowchartRoot;
    /**
     * Module names connected to the central node.
     * `null` = all available modules (auto-includes future ones).
     */
    modules: string[] | null;
    /**
     * Kanban categories and boards shown under the Kanban module.
     * `null` = all categories with all boards.
     */
    kanbanSelection: FlowchartKanbanCategorySelection[] | null;
    /**
     * Legacy flat board list (pre-v4). Kept for read compatibility only;
     * new saves use `kanbanSelection`.
     */
    kanbanIds: string[] | null;
}

export const DEFAULT_FLOWCHART_SETTINGS: SiteFlowchartSettings = {
    enabled: false,
    type: "wbs",
    nodeStyle: "hybrid",
    root: "user",
    modules: null,
    kanbanSelection: null,
    kanbanIds: null,
};

export const FLOWCHART_TYPE_LABELS: Record<FlowchartType, string> = {
    wbs: "Diagramma WBS",
    venn: "Diagramma di Venn",
    gantt: "Diagramma di Gantt",
};

export const FLOWCHART_NODE_STYLE_LABELS: Record<FlowchartNodeStyle, string> = {
    hybrid: "Ibrido",
    rect: "Nodi rettangolari",
    oval: "Nodi ovali",
};

/**
 * Modules that can be connected to the central node of the diagram and shown
 * in the WBS tree. Reports and dashboards are excluded: they are not entities
 * with countable content suitable for the diagram.
 *
 * Single source of truth used by both the admin modal and the WBS builder.
 */
export function getFlowchartSelectableModules(): ModuleConfig[] {
    return AVAILABLE_MODULES.filter(
        (module) =>
            module.href &&
            module.category &&
            module.category !== "reports" &&
            module.name !== "dashboard" &&
            module.name !== "dashboard-forecast",
    );
}

/** Types that are selectable but not yet implemented in the home view. */
export const FLOWCHART_TYPES_COMING_SOON: FlowchartType[] = ["venn", "gantt"];

export const FLOWCHART_ROOT_LABELS: Record<FlowchartRoot, string> = {
    user: "Utente collegato",
    site: "Sito",
};

export const FLOWCHART_ROOT_DESCRIPTIONS: Record<FlowchartRoot, string> = {
    user:
        "L'utente vede solo le sottocategorie e i contenuti a cui ha accesso in base ai suoi permessi.",
    site:
        "Vista completa: mostra tutti i dati presenti nel sito in ogni area e in ogni livello.",
};

/** Coerces a persisted value into a list of unique strings, or null ("all"). */
function parseStringList(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    const list = value
        .filter((entry) =>
            typeof entry === "string" || typeof entry === "number"
        )
        .map((entry) => String(entry));
    return Array.from(new Set(list));
}

function parseKanbanSelectionArray(
    value: unknown,
): FlowchartKanbanCategorySelection[] | null {
    if (!Array.isArray(value)) return null;

    const parsed = value
        .map((entry) => {
            if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
                return null;
            }
            const raw = entry as Record<string, unknown>;
            const categoryId =
                raw.categoryId != null ? String(raw.categoryId) : "";
            if (!categoryId) return null;

            let boardIds: string[] | null = null;
            if (raw.boardIds === null) {
                boardIds = null;
            } else if (Array.isArray(raw.boardIds)) {
                const ids = raw.boardIds
                    .filter((id) =>
                        typeof id === "string" || typeof id === "number"
                    )
                    .map((id) => String(id));
                boardIds = ids.length > 0 ? Array.from(new Set(ids)) : [];
            }

            return { categoryId, boardIds };
        })
        .filter((entry): entry is FlowchartKanbanCategorySelection =>
            entry !== null
        );

    return parsed.length > 0 ? parsed : [];
}

/** Board + category shape used to resolve the effective Kanban filter. */
export interface FlowchartKanbanBoardRef {
    id: number | string;
    categoryId: string | null;
}

/**
 * Resolves which Kanban board ids should appear in the diagram from the
 * hierarchical selection (or legacy flat `kanbanIds`).
 */
export function resolveSelectedKanbanBoardIds(
    allBoards: FlowchartKanbanBoardRef[],
    kanbanSelection: FlowchartKanbanCategorySelection[] | null,
    legacyKanbanIds: string[] | null,
): Set<string> | null {
    if (kanbanSelection && kanbanSelection.length > 0) {
        const byCategory = new Map(
            kanbanSelection.map((entry) => [entry.categoryId, entry]),
        );
        const selected = new Set<string>();

        for (const board of allBoards) {
            const categoryId = board.categoryId ?? "none";
            const entry = byCategory.get(categoryId);
            if (!entry) continue;

            const boardId = String(board.id);
            if (entry.boardIds === null || entry.boardIds.includes(boardId)) {
                selected.add(boardId);
            }
        }

        return selected;
    }

    if (legacyKanbanIds) {
        return new Set(legacyKanbanIds);
    }

    return null;
}

/**
 * Normalises a Kanban selection: when every category has every board selected,
 * returns `null` (meaning "all").
 */
export function normalizeKanbanSelection(
    selection: FlowchartKanbanCategorySelection[],
    categoryIds: string[],
    boardsByCategory: Map<string, string[]>,
): FlowchartKanbanCategorySelection[] | null {
    if (selection.length === 0) return [];

    const allCategoriesSelected = categoryIds.every((categoryId) =>
        selection.some((entry) => entry.categoryId === categoryId)
    );

    if (!allCategoriesSelected) {
        return selection;
    }

    const allBoardsSelected = selection.every((entry) => {
        const categoryBoards = boardsByCategory.get(entry.categoryId) ?? [];
        if (categoryBoards.length === 0) return true;
        return (
            entry.boardIds === null ||
            (entry.boardIds.length === categoryBoards.length &&
                categoryBoards.every((boardId) =>
                    entry.boardIds!.includes(boardId)
                ))
        );
    });

    return allBoardsSelected ? null : selection;
}

function serializeKanbanSelectionForPreview(
    selection: FlowchartKanbanCategorySelection[] | null,
): string | undefined {
    if (selection === null) return undefined;
    return encodeURIComponent(JSON.stringify(selection));
}

function parseKanbanSelectionFromPreviewParam(
    value: string | undefined,
): FlowchartKanbanCategorySelection[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === FLOWCHART_PREVIEW_ALL) return null;

    try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded) as unknown;
        const selection = parseKanbanSelectionArray(parsed);
        return selection ?? [];
    } catch {
        return undefined;
    }
}

/**
 * Coerces any persisted JSONB value into a valid `SiteFlowchartSettings`.
 * Sites without the setting (or with malformed values) always fall back to
 * the safe defaults (disabled). Legacy v1 types (`operativo`, `produzione`,
 * `vendite`) and the removed `position` field are mapped to the WBS default
 * without requiring a DB migration.
 */
/** Query-string token meaning "all items" for list overrides. */
export const FLOWCHART_PREVIEW_ALL = "*";

type FlowchartPreviewSearchParams = {
    preview?: string;
    root?: string;
    nodeStyle?: string;
    type?: string;
    modules?: string;
    kanbanIds?: string;
    kanbanSelection?: string;
};

/**
 * Parses optional draft overrides from the home preview URL
 * (`?view=diagram&preview=draft&...`). Used by the admin modal so the iframe
 * preview matches the in-panel draft, not only the last saved DB value.
 */
export function parseFlowchartDraftFromSearchParams(
    params: FlowchartPreviewSearchParams,
): Partial<SiteFlowchartSettings> | null {
    if (params.preview !== "draft") return null;

    const override: Partial<SiteFlowchartSettings> = { enabled: true };

    if (FLOWCHART_ROOTS.includes(params.root as FlowchartRoot)) {
        override.root = params.root as FlowchartRoot;
    }

    if (FLOWCHART_NODE_STYLES.includes(params.nodeStyle as FlowchartNodeStyle)) {
        override.nodeStyle = params.nodeStyle as FlowchartNodeStyle;
    }

    if (FLOWCHART_TYPES.includes(params.type as FlowchartType)) {
        override.type = params.type as FlowchartType;
    }

    if (params.modules === FLOWCHART_PREVIEW_ALL) {
        override.modules = null;
    } else if (typeof params.modules === "string" && params.modules.length > 0) {
        override.modules = Array.from(
            new Set(params.modules.split(",").map((entry) => entry.trim()).filter(Boolean)),
        );
    }

    if (params.kanbanIds === FLOWCHART_PREVIEW_ALL) {
        override.kanbanIds = null;
    } else if (
        typeof params.kanbanIds === "string" &&
        params.kanbanIds.length > 0
    ) {
        override.kanbanIds = Array.from(
            new Set(
                params.kanbanIds.split(",").map((entry) => entry.trim()).filter(
                    Boolean,
                ),
            ),
        );
    }

    const kanbanSelectionOverride = parseKanbanSelectionFromPreviewParam(
        params.kanbanSelection,
    );
    if (kanbanSelectionOverride !== undefined) {
        override.kanbanSelection = kanbanSelectionOverride;
        override.kanbanIds = null;
    }

    return override;
}

/** Applies optional preview overrides on top of persisted settings. */
export function mergeFlowchartSettings(
    base: SiteFlowchartSettings,
    override: Partial<SiteFlowchartSettings> | null,
): SiteFlowchartSettings {
    if (!override) return base;
    return { ...base, ...override };
}

/** Builds the in-app home preview URL for the current draft configuration. */
export function buildFlowchartPreviewUrl(
    siteSubdomain: string,
    draft: SiteFlowchartSettings,
): string {
    const params = new URLSearchParams({
        view: "diagram",
        preview: "draft",
        root: draft.root,
        nodeStyle: draft.nodeStyle,
        type: draft.type,
    });

    if (draft.modules === null) {
        params.set("modules", FLOWCHART_PREVIEW_ALL);
    } else if (draft.modules.length > 0) {
        params.set("modules", draft.modules.join(","));
    }

    if (draft.kanbanIds === null) {
        params.set("kanbanIds", FLOWCHART_PREVIEW_ALL);
    } else if (draft.kanbanIds.length > 0) {
        params.set("kanbanIds", draft.kanbanIds.join(","));
    }

    const kanbanSelectionParam = serializeKanbanSelectionForPreview(
        draft.kanbanSelection,
    );
    if (kanbanSelectionParam) {
        params.set("kanbanSelection", kanbanSelectionParam);
    } else {
        params.set("kanbanSelection", FLOWCHART_PREVIEW_ALL);
    }

    return `/sites/${siteSubdomain}/home?${params.toString()}`;
}

export function parseFlowchartSettings(value: unknown): SiteFlowchartSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ...DEFAULT_FLOWCHART_SETTINGS };
    }

    const raw = value as Record<string, unknown>;

    const type = FLOWCHART_TYPES.includes(raw.type as FlowchartType)
        ? (raw.type as FlowchartType)
        : DEFAULT_FLOWCHART_SETTINGS.type;

    const root = FLOWCHART_ROOTS.includes(raw.root as FlowchartRoot)
        ? (raw.root as FlowchartRoot)
        : DEFAULT_FLOWCHART_SETTINGS.root;

    const nodeStyle =
        FLOWCHART_NODE_STYLES.includes(raw.nodeStyle as FlowchartNodeStyle)
            ? (raw.nodeStyle as FlowchartNodeStyle)
            : DEFAULT_FLOWCHART_SETTINGS.nodeStyle;

    return {
        enabled: raw.enabled === true,
        type,
        nodeStyle,
        root,
        modules: parseStringList(raw.modules),
        kanbanSelection: parseKanbanSelectionArray(raw.kanbanSelection),
        kanbanIds: parseStringList(raw.kanbanIds),
    };
}
