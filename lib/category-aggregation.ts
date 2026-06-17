import type {
  CategoryCardData,
  SubcategoryCardData,
} from "@/types/category-cards";
import type { InventoryCategory } from "@/types/supabase";

export const EMPTY_SUBCATEGORY_KEY = "__none__";
export const EMPTY_SUBCATEGORY_LABEL = "Senza sottocategoria";

export interface InventoryRowForAggregation {
  category_id?: string | null;
  category?: { id?: string } | null;
  subcategory?: string | null;
  stock_quantity?: number | null;
  quantity?: number | null;
  purchase_unit_price?: number | null;
  unit_price?: number | null;
  attributes?: {
    subcategory?: string | null;
    [key: string]: unknown;
  } | null;
}

function getRowQuantity(row: InventoryRowForAggregation): number {
  return row.stock_quantity ?? row.quantity ?? 0;
}

function getRowUnitPrice(row: InventoryRowForAggregation): number {
  return row.purchase_unit_price ?? row.unit_price ?? 0;
}

function getRowCategoryId(row: InventoryRowForAggregation): string | null {
  return row.category_id ?? row.category?.id ?? null;
}

function getRowSubcategory(row: InventoryRowForAggregation): string {
  const raw =
    row.subcategory ??
    row.attributes?.subcategory ??
    "";
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : EMPTY_SUBCATEGORY_LABEL;
}

export function getSubcategoryKey(name: string): string {
  return name === EMPTY_SUBCATEGORY_LABEL ? EMPTY_SUBCATEGORY_KEY : name;
}

function compareSubcategoryOrder(
  a: SubcategoryCardData,
  b: SubcategoryCardData,
): number {
  const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "it");
}

export function mergeSubcategoryRecords(
  cards: SubcategoryCardData[],
  records: Array<{
    subcategory_key: string;
    subcategory_name: string;
    image_url?: string | null;
    description?: string | null;
    sort_order?: number;
  }>,
): SubcategoryCardData[] {
  const merged = new Map(cards.map((card) => [card.key, { ...card }]));

  for (const record of records) {
    const existing = merged.get(record.subcategory_key);
    if (existing) {
      merged.set(record.subcategory_key, {
        ...existing,
        name: existing.name || record.subcategory_name,
        image_url: record.image_url ?? existing.image_url ?? null,
        description: record.description ?? existing.description ?? null,
        sort_order: record.sort_order ?? existing.sort_order,
      });
    } else {
      merged.set(record.subcategory_key, {
        key: record.subcategory_key,
        name: record.subcategory_name,
        pieces: 0,
        totalValue: 0,
        itemCount: 0,
        image_url: record.image_url ?? null,
        description: record.description ?? null,
        sort_order: record.sort_order,
      });
    }
  }

  return Array.from(merged.values()).sort(compareSubcategoryOrder);
}

/** @deprecated Use mergeSubcategoryRecords */
export function mergeSubcategoryImages(
  cards: SubcategoryCardData[],
  images: Array<{ subcategory_key: string; image_url: string | null }>,
): SubcategoryCardData[] {
  return mergeSubcategoryRecords(
    cards,
    images.map((row) => ({
      subcategory_key: row.subcategory_key,
      subcategory_name: row.subcategory_key,
      image_url: row.image_url,
    })),
  );
}

export function aggregateCategoryCards(
  categories: InventoryCategory[],
  inventoryRows: InventoryRowForAggregation[],
): CategoryCardData[] {
  const aggregates = new Map<
    string,
    { pieces: number; totalValue: number; itemCount: number; subcategories: Set<string> }
  >();

  for (const row of inventoryRows) {
    const categoryId = getRowCategoryId(row);
    if (!categoryId) continue;

    const qty = getRowQuantity(row);
    const price = getRowUnitPrice(row);
    const subcategory = getRowSubcategory(row);

    const current = aggregates.get(categoryId) ?? {
      pieces: 0,
      totalValue: 0,
      itemCount: 0,
      subcategories: new Set<string>(),
    };

    current.pieces += qty;
    current.totalValue += qty * price;
    current.itemCount += 1;
    current.subcategories.add(subcategory);
    aggregates.set(categoryId, current);
  }

  return categories.map((category) => {
    const stats = aggregates.get(category.id);
    return {
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description,
      image_url: category.image_url,
      sort_order: category.sort_order,
      pieces: stats?.pieces ?? 0,
      totalValue: stats?.totalValue ?? 0,
      itemCount: stats?.itemCount ?? 0,
      subcategoryCount: stats?.subcategories.size ?? 0,
    };
  });
}

export function countMergedSubcategories(
  categoryId: string,
  inventoryRows: InventoryRowForAggregation[],
  subcategoryRecords: Array<{
    subcategory_key: string;
    subcategory_name: string;
    image_url?: string | null;
    description?: string | null;
    sort_order?: number;
  }> = [],
): number {
  return mergeSubcategoryRecords(
    aggregateSubcategoryCards(categoryId, inventoryRows),
    subcategoryRecords,
  ).length;
}

export function aggregateSubcategoryCards(
  categoryId: string,
  inventoryRows: InventoryRowForAggregation[],
): SubcategoryCardData[] {
  const aggregates = new Map<
    string,
    { name: string; pieces: number; totalValue: number; itemCount: number }
  >();

  for (const row of inventoryRows) {
    if (getRowCategoryId(row) !== categoryId) continue;

    const subcategoryName = getRowSubcategory(row);
    const key = getSubcategoryKey(subcategoryName);
    const qty = getRowQuantity(row);
    const price = getRowUnitPrice(row);

    const current = aggregates.get(key) ?? {
      name: subcategoryName,
      pieces: 0,
      totalValue: 0,
      itemCount: 0,
    };

    current.pieces += qty;
    current.totalValue += qty * price;
    current.itemCount += 1;
    aggregates.set(key, current);
  }

  return Array.from(aggregates.entries())
    .map(([key, stats]) => ({
      key,
      name: stats.name,
      pieces: stats.pieces,
      totalValue: stats.totalValue,
      itemCount: stats.itemCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function filterInventoryByCategory(
  inventoryRows: InventoryRowForAggregation[],
  categoryId: string,
): InventoryRowForAggregation[] {
  return inventoryRows.filter((row) => getRowCategoryId(row) === categoryId);
}

export function filterInventoryByCategoryAndSubcategory<
  T extends InventoryRowForAggregation,
>(
  inventoryRows: T[],
  categoryId: string,
  subcategoryKey: string,
): T[] {
  return inventoryRows.filter((row) => {
    if (getRowCategoryId(row) !== categoryId) return false;
    const key = getSubcategoryKey(getRowSubcategory(row));
    return key === subcategoryKey;
  });
}
