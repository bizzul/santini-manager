import {
  EMPTY_SUBCATEGORY_KEY,
  EMPTY_SUBCATEGORY_LABEL,
  getSubcategoryKey,
} from "@/lib/category-aggregation";
import type {
  SellCategoryCardData,
  SellSubcategoryCardData,
} from "@/types/sell-product-category-cards";
import type { SellProduct, SellProductCategory } from "@/types/supabase";

export interface SellProductRowForAggregation {
  category_id?: number | null;
  category?: { id?: number } | null;
  subcategory?: string | null;
  type?: string | null;
}

function getRowCategoryId(row: SellProductRowForAggregation): number | null {
  return row.category_id ?? row.category?.id ?? null;
}

function getRowSubcategory(row: SellProductRowForAggregation): string {
  const raw = row.subcategory ?? row.type ?? "";
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : EMPTY_SUBCATEGORY_LABEL;
}

function compareSubcategoryOrder(
  a: SellSubcategoryCardData,
  b: SellSubcategoryCardData,
): number {
  const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "it");
}

export function mergeSellSubcategoryRecords(
  cards: SellSubcategoryCardData[],
  records: Array<{
    subcategory_key: string;
    subcategory_name: string;
    image_url?: string | null;
    description?: string | null;
    sort_order?: number;
  }>,
): SellSubcategoryCardData[] {
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

export function aggregateSellCategoryCards(
  categories: SellProductCategory[],
  products: SellProductRowForAggregation[],
): SellCategoryCardData[] {
  const aggregates = new Map<
    number,
    { itemCount: number; subcategories: Set<string> }
  >();

  for (const row of products) {
    const categoryId = getRowCategoryId(row);
    if (!categoryId) continue;

    const subcategory = getRowSubcategory(row);
    const current = aggregates.get(categoryId) ?? {
      itemCount: 0,
      subcategories: new Set<string>(),
    };

    current.itemCount += 1;
    current.subcategories.add(subcategory);
    aggregates.set(categoryId, current);
  }

  return categories.map((category) => {
    const stats = aggregates.get(category.id);
    const itemCount = stats?.itemCount ?? 0;
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      image_url: category.image_url,
      sort_order: category.sort_order,
      itemCount,
      subcategoryCount: stats?.subcategories.size ?? 0,
      pieces: itemCount,
      totalValue: 0,
    };
  });
}

export function countMergedSellSubcategories(
  categoryId: number,
  products: SellProductRowForAggregation[],
  subcategoryRecords: Array<{
    subcategory_key: string;
    subcategory_name: string;
    image_url?: string | null;
    description?: string | null;
    sort_order?: number;
  }> = [],
): number {
  return mergeSellSubcategoryRecords(
    aggregateSellSubcategoryCards(categoryId, products),
    subcategoryRecords,
  ).length;
}

export function aggregateSellSubcategoryCards(
  categoryId: number,
  products: SellProductRowForAggregation[],
): SellSubcategoryCardData[] {
  const aggregates = new Map<
    string,
    { name: string; itemCount: number }
  >();

  for (const row of products) {
    if (getRowCategoryId(row) !== categoryId) continue;

    const subcategoryName = getRowSubcategory(row);
    const key = getSubcategoryKey(subcategoryName);
    const current = aggregates.get(key) ?? {
      name: subcategoryName,
      itemCount: 0,
    };
    current.itemCount += 1;
    aggregates.set(key, current);
  }

  return Array.from(aggregates.entries())
    .map(([key, stats]) => ({
      key,
      name: stats.name,
      pieces: stats.itemCount,
      totalValue: 0,
      itemCount: stats.itemCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function filterSellProductsByCategory<
  T extends SellProductRowForAggregation,
>(products: T[], categoryId: number): T[] {
  return products.filter((row) => getRowCategoryId(row) === categoryId);
}

export function filterSellProductsByCategoryAndSubcategory<
  T extends SellProductRowForAggregation,
>(products: T[], categoryId: number, subcategoryKey: string): T[] {
  return products.filter((row) => {
    if (getRowCategoryId(row) !== categoryId) return false;
    return getSubcategoryKey(getRowSubcategory(row)) === subcategoryKey;
  });
}
