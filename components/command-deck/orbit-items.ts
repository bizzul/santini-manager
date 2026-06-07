/**
 * Common shape for every "orbit item" rendered around a selected node, plus
 * normalizers that take the raw entity shapes returned by `lib/server-data.ts`
 * and map them into `OrbitItem`s.
 */

import {
  EMPTY_SUBCATEGORY_KEY,
  EMPTY_SUBCATEGORY_LABEL,
  getSubcategoryKey,
} from "@/lib/category-aggregation";

export type OrbitItemKind =
  | "category"
  | "subcategory"
  | "entity"
  | "activity";

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
  /** Drill / navigation semantics. Defaults to `"entity"` when omitted. */
  kind?: OrbitItemKind;
  /** Key used to resolve the next drill level (`childrenKey` on category/subcategory). */
  childrenKey?: string;
  /** Pre-resolved open href (activities, entities with known targets). */
  href?: string | null;
  /** Optional status label (e.g. "pending", "high"). */
  status?: string | null;
  /** Optional ISO date string for deadlines. */
  dueDate?: string | null;
  /** Module id this item belongs to (activities, cross-module entities). */
  moduleId?: string | null;
}

/** Current drill-down position inside a module with category hierarchy. */
export interface DrillState {
  categoryKey?: string;
  subcategoryKey?: string;
}

/** Per-module drill hierarchy for prodotti / inventario. */
export interface ModuleDrillData {
  categories: OrbitItem[];
  subcategoriesByCategory: Record<string, OrbitItem[]>;
  entitiesByCategorySubcategory: Record<string, Record<string, OrbitItem[]>>;
}

export type ModuleDrillGroups = Partial<
  Record<"prodotti" | "inventario", ModuleDrillData>
>;

const DRILL_MODULES = new Set(["prodotti", "inventario"]);

export function moduleHasDrill(moduleId: string): boolean {
  return DRILL_MODULES.has(moduleId);
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
export function makeOrbitItem(params: {
  id: string | number;
  label: string | null | undefined;
  imageUrl?: string | null;
  category?: string | null;
  color?: string | null;
  kind?: OrbitItemKind;
  childrenKey?: string;
  href?: string | null;
  status?: string | null;
  dueDate?: string | null;
  moduleId?: string | null;
}): OrbitItem {
  const label = str(params.label) ?? "—";
  return {
    id: String(params.id),
    label,
    initials: makeInitials(label),
    imageUrl: str(params.imageUrl ?? null),
    category: str(params.category ?? null),
    color: str(params.color ?? null),
    kind: params.kind ?? "entity",
    childrenKey: params.childrenKey,
    href: params.href ?? null,
    status: str(params.status ?? null),
    dueDate: str(params.dueDate ?? null),
    moduleId: params.moduleId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Drill grouping — prodotti & inventario (read-only, from existing fetch data)
// ---------------------------------------------------------------------------

function productSubcategoryKey(raw: {
  subcategory?: string | null;
  type?: string | null;
}): { key: string; label: string } {
  const label =
    (raw.subcategory ?? raw.type ?? "").trim() || EMPTY_SUBCATEGORY_LABEL;
  return { key: getSubcategoryKey(label), label };
}

/** Build category → subcategory → product drill data from `fetchSellProducts` rows. */
export function buildProductDrillData(rawProducts: unknown[]): ModuleDrillData {
  type ProductRow = {
    id?: number | string;
    name?: string | null;
    image_url?: string | null;
    category_id?: number | null;
    category?: { id?: number; name?: string | null; color?: string | null } | null;
    subcategory?: string | null;
    type?: string | null;
  };

  const byCategory = new Map<
    string,
    {
      name: string;
      color: string | null;
      products: ProductRow[];
    }
  >();

  for (const raw of rawProducts) {
    const p = raw as ProductRow;
    if (p.id === undefined || !p.name) continue;
    const catId = String(p.category_id ?? p.category?.id ?? "none");
    const catName = p.category?.name ?? "Senza categoria";
    const catColor = p.category?.color ?? null;
    if (!byCategory.has(catId)) {
      byCategory.set(catId, { name: catName, color: catColor, products: [] });
    }
    byCategory.get(catId)!.products.push(p);
  }

  const categories: OrbitItem[] = [];
  const subcategoriesByCategory: Record<string, OrbitItem[]> = {};
  const entitiesByCategorySubcategory: Record<
    string,
    Record<string, OrbitItem[]>
  > = {};

  const sortedCategories = Array.from(byCategory.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name, "it"),
  );

  for (const [catKey, { name, color, products }] of sortedCategories) {
    categories.push(
      makeOrbitItem({
        id: `cat-${catKey}`,
        label: name,
        category: `${products.length} articoli`,
        color,
        kind: "category",
        childrenKey: catKey,
      }),
    );

    const bySubcat = new Map<string, { label: string; products: ProductRow[] }>();
    for (const p of products) {
      const { key, label } = productSubcategoryKey(p);
      if (!bySubcat.has(key)) {
        bySubcat.set(key, { label, products: [] });
      }
      bySubcat.get(key)!.products.push(p);
    }

    subcategoriesByCategory[catKey] = [];
    entitiesByCategorySubcategory[catKey] = {};

    const sortedSubs = Array.from(bySubcat.entries()).sort((a, b) =>
      a[1].label.localeCompare(b[1].label, "it"),
    );

    for (const [subKey, { label: subLabel, products: subProducts }] of sortedSubs) {
      subcategoriesByCategory[catKey].push(
        makeOrbitItem({
          id: `sub-${catKey}-${subKey}`,
          label: subLabel,
          category: name,
          color,
          kind: "subcategory",
          childrenKey: subKey,
        }),
      );

      entitiesByCategorySubcategory[catKey][subKey] = subProducts
        .map((p) =>
          makeOrbitItem({
            id: p.id!,
            label: p.name,
            imageUrl: p.image_url ?? null,
            category: subLabel,
            color,
            kind: "entity",
          }),
        )
        .sort((a, b) => a.label.localeCompare(b.label, "it"));
    }
  }

  return { categories, subcategoriesByCategory, entitiesByCategorySubcategory };
}

function inventoryItemSubcategory(item: {
  variants?: Array<{ attributes?: { subcategory?: string | null } | null }>;
}): { key: string; label: string } {
  const variants = item.variants ?? [];
  for (const v of variants) {
    const raw = v.attributes?.subcategory;
    if (raw && String(raw).trim()) {
      const label = String(raw).trim();
      return { key: getSubcategoryKey(label), label };
    }
  }
  return { key: EMPTY_SUBCATEGORY_KEY, label: EMPTY_SUBCATEGORY_LABEL };
}

/** Build category → subcategory → item drill data from `fetchInventoryItems` rows. */
export function buildInventoryDrillData(
  rawItems: unknown[],
): ModuleDrillData {
  type ItemRow = {
    id?: string | number;
    name?: string | null;
    image_url?: string | null;
    category_id?: string | null;
    category?: { id?: string; name?: string | null } | null;
    variants?: Array<{ attributes?: { subcategory?: string | null } | null }>;
  };

  const byCategory = new Map<
    string,
    { name: string; items: ItemRow[] }
  >();

  for (const raw of rawItems) {
    const item = raw as ItemRow;
    if (item.id === undefined || !item.name) continue;
    const catId = String(item.category_id ?? item.category?.id ?? "none");
    const catName = item.category?.name ?? "Senza categoria";
    if (!byCategory.has(catId)) {
      byCategory.set(catId, { name: catName, items: [] });
    }
    byCategory.get(catId)!.items.push(item);
  }

  const categories: OrbitItem[] = [];
  const subcategoriesByCategory: Record<string, OrbitItem[]> = {};
  const entitiesByCategorySubcategory: Record<
    string,
    Record<string, OrbitItem[]>
  > = {};

  const sortedCategories = Array.from(byCategory.entries()).sort((a, b) =>
    a[1].name.localeCompare(b[1].name, "it"),
  );

  for (const [catKey, { name, items }] of sortedCategories) {
    categories.push(
      makeOrbitItem({
        id: `cat-${catKey}`,
        label: name,
        category: `${items.length} articoli`,
        kind: "category",
        childrenKey: catKey,
      }),
    );

    const bySubcat = new Map<string, { label: string; items: ItemRow[] }>();
    for (const item of items) {
      const { key, label } = inventoryItemSubcategory(item);
      if (!bySubcat.has(key)) {
        bySubcat.set(key, { label, items: [] });
      }
      bySubcat.get(key)!.items.push(item);
    }

    subcategoriesByCategory[catKey] = [];
    entitiesByCategorySubcategory[catKey] = {};

    const sortedSubs = Array.from(bySubcat.entries()).sort((a, b) =>
      a[1].label.localeCompare(b[1].label, "it"),
    );

    for (const [subKey, { label: subLabel, items: subItems }] of sortedSubs) {
      subcategoriesByCategory[catKey].push(
        makeOrbitItem({
          id: `sub-${catKey}-${subKey}`,
          label: subLabel,
          category: name,
          kind: "subcategory",
          childrenKey: subKey,
        }),
      );

      entitiesByCategorySubcategory[catKey][subKey] = subItems
        .map((item) =>
          makeOrbitItem({
            id: item.id!,
            label: item.name,
            imageUrl: item.image_url ?? null,
            category: subLabel,
            kind: "entity",
          }),
        )
        .sort((a, b) => a.label.localeCompare(b.label, "it"));
    }
  }

  return { categories, subcategoriesByCategory, entitiesByCategorySubcategory };
}

/**
 * Resolve which orbit items to render for the current module + drill level.
 */
export function resolveActiveOrbitItems(
  moduleId: string | null,
  drill: DrillState,
  orbitGroups: OrbitGroups,
  drillGroups: ModuleDrillGroups,
): OrbitItem[] {
  if (!moduleId) return [];

  const drillData = drillGroups[moduleId as keyof ModuleDrillGroups];
  if (drillData) {
    if (!drill.categoryKey) {
      return drillData.categories;
    }
    if (!drill.subcategoryKey) {
      return drillData.subcategoriesByCategory[drill.categoryKey] ?? [];
    }
    return (
      drillData.entitiesByCategorySubcategory[drill.categoryKey]?.[
        drill.subcategoryKey
      ] ?? []
    );
  }

  return orbitGroups[moduleId]?.items ?? [];
}

/** Human-readable breadcrumb segments for the current drill path. */
export function getDrillBreadcrumb(
  moduleId: string,
  drill: DrillState,
  drillGroups: ModuleDrillGroups,
): Array<{ key: string; label: string; level: "category" | "subcategory" }> {
  const drillData = drillGroups[moduleId as keyof ModuleDrillGroups];
  if (!drillData || !drill.categoryKey) return [];

  const cat = drillData.categories.find((c) => c.childrenKey === drill.categoryKey);
  const crumbs: Array<{
    key: string;
    label: string;
    level: "category" | "subcategory";
  }> = [];

  if (cat) {
    crumbs.push({
      key: drill.categoryKey,
      label: cat.label,
      level: "category",
    });
  }

  if (drill.subcategoryKey) {
    const sub = drillData.subcategoriesByCategory[drill.categoryKey]?.find(
      (s) => s.childrenKey === drill.subcategoryKey,
    );
    if (sub) {
      crumbs.push({
        key: drill.subcategoryKey,
        label: sub.label,
        level: "subcategory",
      });
    }
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// Normalizers — one per data source
// ---------------------------------------------------------------------------

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
        kind: "entity",
        moduleId: "clienti",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

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
        kind: "entity",
        moduleId: "fornitori",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

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
        kind: "entity",
        moduleId: "prodotti",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

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
        kind: "entity",
        moduleId: "progetti",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

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
        kind: "entity",
        moduleId: "inventario",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

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
        kind: "entity",
        moduleId: "fabbrica",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

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
        kind: "entity",
        moduleId: "admin",
      });
    })
    .filter((x): x is OrbitItem => x !== null);
}

// ---------------------------------------------------------------------------
// Cap & "more" helper
// ---------------------------------------------------------------------------

export const MAX_ORBIT_ITEMS = 48;

export interface OrbitSet {
  items: OrbitItem[];
  total: number;
  truncated: boolean;
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

export type OrbitGroups = Record<string, OrbitSet>;
