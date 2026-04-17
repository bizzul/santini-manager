/**
 * Common shape for every "orbit item" rendered around a selected node, plus
 * normalizers that take the raw entity shapes returned by `lib/server-data.ts`
 * and map them into `OrbitItem`s.
 *
 * Design goals:
 *  - Single shape for all sources → one generic renderer in `OrbitRing.tsx`.
 *  - Never throw on missing fields (real data can be partial or legacy).
 *  - Always produce a usable `label` + `initials` so the fallback avatar
 *    disc is always meaningful.
 */

export interface OrbitItem {
  /** Stable unique id (stringified — entities may be numeric, uuid or composite). */
  id: string;
  /** Primary display name. Never empty ("—" if truly missing). */
  label: string;
  /** Two-char initials generated from label. */
  initials: string;
  /** Optional logo/avatar/photo URL. */
  imageUrl: string | null;
  /** Optional group/tag (supplier category, kanban title, role, …). */
  category: string | null;
  /** Optional accent color (hex). Falls back to parent node color at render. */
  color: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Two-letter initials, uppercase. Falls back to "—" when label is empty. */
export function makeInitials(label: string | null | undefined): string {
  const safe = (label ?? "").trim();
  if (!safe) return "—";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Wraps a value into a trimmed string or null. */
function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Builds an OrbitItem from the raw primitives, filling in sane defaults. */
function makeOrbitItem(params: {
  id: string | number;
  label: string | null | undefined;
  imageUrl?: string | null;
  category?: string | null;
  color?: string | null;
}): OrbitItem {
  const label = str(params.label) ?? "—";
  return {
    id: String(params.id),
    label,
    initials: makeInitials(label),
    imageUrl: str(params.imageUrl ?? null),
    category: str(params.category ?? null),
    color: str(params.color ?? null),
  };
}

// ---------------------------------------------------------------------------
// Normalizers — one per data source
// ---------------------------------------------------------------------------

/**
 * `fetchClients(siteId)` returns rows from the `Client` table. We prefer
 * `businessName` for companies; individual clients get `firstName lastName`.
 * No logo field exists on the schema → `imageUrl` is always null.
 */
export function normalizeClients(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        businessName?: string | null;
        individualFirstName?: string | null;
        individualLastName?: string | null;
        clientType?: string | null;
      };
      const personal = [r.individualFirstName, r.individualLastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const label = r.businessName || personal || null;
      if (r.id === undefined || !label) return null;
      return makeOrbitItem({
        id: r.id,
        label,
        category: r.clientType ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

/** `fetchSuppliers(siteId)` rows from `Supplier`. */
export function normalizeSuppliers(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        name?: string | null;
        short_name?: string | null;
        supplier_image?: string | null;
        supplier_category?: { name?: string | null } | null;
      };
      const label = r.name || r.short_name || null;
      if (r.id === undefined || !label) return null;
      return makeOrbitItem({
        id: r.id,
        label,
        imageUrl: r.supplier_image ?? null,
        category: r.supplier_category?.name ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

/** `fetchSellProducts(siteId)` rows from `SellProduct`. */
export function normalizeProducts(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        name?: string | null;
        image_url?: string | null;
        category?: { name?: string | null; color?: string | null } | null;
      };
      if (r.id === undefined || !r.name) return null;
      return makeOrbitItem({
        id: r.id,
        label: r.name,
        imageUrl: r.image_url ?? null,
        category: r.category?.name ?? null,
        color: r.category?.color ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

/**
 * `fetchProjectsData(siteId).tasks` rows from `Task` (each task is a
 * project card in the kanban). We prefer `name`, fall back to `unique_code`.
 */
export function normalizeProjects(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        name?: string | null;
        unique_code?: string | null;
        Kanban?: { title?: string | null } | null;
        SellProduct?: {
          category?: { color?: string | null } | null;
        } | null;
      };
      const label = r.name || r.unique_code || null;
      if (r.id === undefined || !label) return null;
      return makeOrbitItem({
        id: r.id,
        label,
        category: r.Kanban?.title ?? null,
        color: r.SellProduct?.category?.color ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

/** `fetchInventoryItems(siteId)` rows from `inventory_items`. */
export function normalizeInventory(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        name?: string | null;
        image_url?: string | null;
        category?: { name?: string | null; color?: string | null } | null;
      };
      if (r.id === undefined || !r.name) return null;
      return makeOrbitItem({
        id: r.id,
        label: r.name,
        imageUrl: r.image_url ?? null,
        category: r.category?.name ?? null,
        color: r.category?.color ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

/**
 * `fetchFactoryDashboardData(siteId).departments` — synthesized from
 * production kanbans. Each "department" is a kanban with color + icon
 * metadata, mapped 1:1 to an orbit item.
 */
export function normalizeFactoryDepartments(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        name?: string | null;
        color?: string | null;
      };
      if (r.id === undefined || !r.name) return null;
      return makeOrbitItem({
        id: r.id,
        label: r.name,
        category: "Produzione",
        color: r.color ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

/** `fetchUsers(siteId)` rows from `User` (site + organization members). */
export function normalizeAdminUsers(rows: unknown[]): OrbitItem[] {
  return rows
    .map((raw) => {
      const r = raw as {
        id?: number | string;
        authId?: string | null;
        given_name?: string | null;
        family_name?: string | null;
        email?: string | null;
        picture?: string | null;
        role?: string | null;
      };
      const fullName = [r.given_name, r.family_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const label = fullName || r.email || null;
      const id = r.id ?? r.authId;
      if (id === undefined || id === null || !label) return null;
      return makeOrbitItem({
        id,
        label,
        imageUrl: r.picture ?? null,
        category: r.role ?? null,
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

// ---------------------------------------------------------------------------
// Cap & "more" helper
// ---------------------------------------------------------------------------

/**
 * Large collections (e.g. 1k+ products) would be visual noise on a single
 * circumference. We render at most MAX_ORBIT_ITEMS; the caller can surface
 * the overflow via `buildOrbitSet(items)` which also returns the total.
 */
export const MAX_ORBIT_ITEMS = 48;

export interface OrbitSet {
  items: OrbitItem[];
  /** Total items available before the visual cap was applied. */
  total: number;
  /** Whether the rendered list was truncated. */
  truncated: boolean;
  /** `true` if the items are synthetic (demo fallback) rather than real. */
  isDemo: boolean;
}

export function buildOrbitSet(
  items: OrbitItem[],
  opts: { isDemo?: boolean; max?: number } = {},
): OrbitSet {
  const max = opts.max ?? MAX_ORBIT_ITEMS;
  const truncated = items.length > max;
  return {
    items: truncated ? items.slice(0, max) : items,
    total: items.length,
    truncated,
    isDemo: opts.isDemo ?? false,
  };
}

/** Map keyed by node id → OrbitSet. */
export type OrbitGroups = Record<string, OrbitSet>;
