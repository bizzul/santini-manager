/**
 * Client-safe types, defaults and parsing for persisted diagram layouts.
 *
 * Layouts store user-arranged node positions for a given diagram screen.
 * They are persisted per-site (shared) in the `site_settings` table under a
 * key built with `diagramLayoutsKey(diagramKey)`. The server reader lives in
 * `lib/diagram-layouts.server.ts`; writes go through `/api/diagram-layouts`.
 */

export type DiagramKey =
  | "home-wbs"
  | "kanban"
  | "projects"
  | "products"
  | "inventory"
  | "clients"
  | "collaborators";

export interface DiagramNodePosition {
  x: number;
  y: number;
}

export interface DiagramLayout {
  id: string;
  name: string;
  positions: Record<string, DiagramNodePosition>;
  updatedAt: string;
}

export interface DiagramLayoutsSetting {
  activeId: string | null;
  layouts: DiagramLayout[];
}

export const DEFAULT_DIAGRAM_LAYOUTS: DiagramLayoutsSetting = {
  activeId: null,
  layouts: [],
};

/** Builds the `site_settings` key for a diagram's layouts. */
export function diagramLayoutsKey(diagramKey: DiagramKey | string): string {
  return `diagram_layouts:${diagramKey}`;
}

function parsePositions(raw: unknown): Record<string, DiagramNodePosition> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, DiagramNodePosition> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { x, y } = value as { x?: unknown; y?: unknown };
    if (typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y)) {
      result[id] = { x, y };
    }
  }
  return result;
}

function parseLayout(raw: unknown): DiagramLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id : null;
  const name = typeof obj.name === "string" ? obj.name : null;
  if (!id || !name) return null;
  return {
    id,
    name,
    positions: parsePositions(obj.positions),
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date(0).toISOString(),
  };
}

/** Coerces arbitrary JSONB into a safe `DiagramLayoutsSetting`. */
export function parseDiagramLayouts(raw: unknown): DiagramLayoutsSetting {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DIAGRAM_LAYOUTS };
  const obj = raw as Record<string, unknown>;
  const layouts = Array.isArray(obj.layouts)
    ? obj.layouts.map(parseLayout).filter((l): l is DiagramLayout => l !== null)
    : [];
  const activeId =
    typeof obj.activeId === "string" &&
    layouts.some((layout) => layout.id === obj.activeId)
      ? obj.activeId
      : null;
  return { activeId, layouts };
}

/** Generates a reasonably-unique id for a new layout. */
export function createLayoutId(): string {
  return `lyt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
