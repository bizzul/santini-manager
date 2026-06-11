/**
 * Client-safe types for the home WBS diagram tree.
 * The server-side builder lives in `lib/wbs-data.server.ts`.
 */
import type { FlowchartRoot } from "./flowchart-settings";

/** A label/value row inside a leaf detail section. */
export interface WbsDetailRow {
    label: string;
    value: string;
}

/** Per-kanban-column numeric stats used by the histogram chart. */
export interface WbsColumnStat {
    /** Kanban column name (e.g. "To do", "Inviata"). */
    label: string;
    /** Number of cards/projects in the column. */
    tasks: number;
    /** Total pieces (sum of numero_pezzi) in the column. */
    pieces: number;
    /** Total commercial value (sum of sellPrice, CHF) in the column. */
    value: number;
}

/** A titled section of a leaf detail (e.g. one kanban board). */
export interface WbsDetailSection {
    title: string;
    rows: WbsDetailRow[];
    /** When present, the section is rendered as a column histogram. */
    chart?: WbsColumnStat[];
}

/** Summary shown when the user clicks a level-3 node. */
export interface WbsLeafDetail {
    title: string;
    sections: WbsDetailSection[];
}

/** Round avatar shown on collaborator leaves. */
export interface WbsLeafAvatar {
    initials: string;
    imageUrl?: string | null;
    /** Per-user accent color (hex) when defined in the profile. */
    color?: string | null;
}

/** Level 3: content entry of a module (counter or named record). */
export interface WbsLeaf {
    id: string;
    label: string;
    /** Optional count shown as a badge on the leaf node. */
    badge?: string;
    /** Optional accent color defined on the source category (hex/css). */
    color?: string;
    /** Lucide icon name from the kanban icon library (e.g. "BadgeDollarSign"). */
    icon?: string;
    /** Round avatar (collaborator leaves). */
    avatar?: WbsLeafAvatar;
    /**
     * Deep link for this subcategory, relative to the site base
     * (e.g. "/kanban?name=offerte&category=vendita"). When present, the
     * standard-view card navigates here instead of the generic module page.
     */
    href?: string;
    /** When present, clicking the leaf opens this summary. */
    detail?: WbsLeafDetail;
}

/** Level 2: a module of the site, clickable + expandable. */
export interface WbsModuleNode {
    name: string;
    label: string;
    /** Relative module route (e.g. "/kanban"). */
    href: string;
    /** FontAwesome icon name from the module config (e.g. "faTable"). */
    icon?: string;
    /** Numeric count shown as a badge on the module node (e.g. "27"). */
    badge?: string;
    items: WbsLeaf[];
}

export type WbsCategoryKey = "core" | "management" | "tools" | "reports";

/** Level 1: a module category, expandable. */
export interface WbsCategoryNode {
    category: WbsCategoryKey;
    label: string;
    modules: WbsModuleNode[];
}

/** Root node (level 0): logged-in user or site. */
export interface WbsRootNode {
    kind: FlowchartRoot;
    label: string;
    sublabel?: string;
    initials: string;
}

export interface WbsTree {
    root: WbsRootNode;
    categories: WbsCategoryNode[];
}
