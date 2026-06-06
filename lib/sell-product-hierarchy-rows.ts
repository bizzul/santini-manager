import {
  EMPTY_SUBCATEGORY_LABEL,
  getSubcategoryKey,
} from "@/lib/category-aggregation";
import {
  aggregateSellSubcategoryCards,
  countMergedSellSubcategories,
  filterSellProductsByCategoryAndSubcategory,
  mergeSellSubcategoryRecords,
} from "@/lib/sell-product-category-aggregation";
import type {
  SellCategoryCardData,
  SellSubcategoryImageRecord,
} from "@/types/sell-product-category-cards";
import type {
  SellProductHierarchyRow,
  SellProductHierarchyRowType,
} from "@/types/sell-product-hierarchy";
import { getSellSubcategoryExpansionKey } from "@/types/sell-product-hierarchy";
import type { SellProductWithAction } from "@/app/sites/[domain]/products/columns";

export interface BuildSellHierarchyRowsInput {
  categoryCards: SellCategoryCardData[];
  products: SellProductWithAction[];
  subcategoryImages: SellSubcategoryImageRecord[];
  expandedCategories: ReadonlySet<string>;
  expandedSubcategories: ReadonlySet<string>;
  visibleCategoryIds?: ReadonlySet<string> | null;
}

export function buildVisibleSellHierarchyRows(
  input: BuildSellHierarchyRowsInput,
): SellProductHierarchyRow[] {
  const {
    categoryCards,
    products,
    subcategoryImages,
    expandedCategories,
    expandedSubcategories,
    visibleCategoryIds,
  } = input;

  const rows: SellProductHierarchyRow[] = [];
  const visibleCards = visibleCategoryIds
    ? categoryCards.filter((card) => visibleCategoryIds.has(String(card.id)))
    : categoryCards;

  for (const card of visibleCards) {
    const categoryId = String(card.id);
    const categorySubcategoryImages = subcategoryImages.filter(
      (image) => image.category_id === card.id,
    );
    const totalSubcategoryCount = countMergedSellSubcategories(
      card.id,
      products,
      categorySubcategoryImages,
    );

    rows.push({
      rowId: `category:${categoryId}`,
      type: "category",
      depth: 0,
      categoryId,
      categoryIdNum: card.id,
      categoryName: card.name,
      categoryColor: card.color,
      itemCount: card.itemCount,
      subcategoryCount: totalSubcategoryCount,
      pieces: card.pieces,
      totalValue: card.totalValue,
      categoryCard: card,
    });

    if (!expandedCategories.has(categoryId)) {
      continue;
    }

    const subcategoryCards = mergeSellSubcategoryRecords(
      aggregateSellSubcategoryCards(card.id, products),
      categorySubcategoryImages,
    );

    for (const subcategory of subcategoryCards) {
      const expansionKey = getSellSubcategoryExpansionKey(
        categoryId,
        subcategory.key,
      );

      rows.push({
        rowId: `subcategory:${expansionKey}`,
        type: "subcategory",
        depth: 1,
        categoryId,
        categoryIdNum: card.id,
        categoryName: card.name,
        categoryColor: card.color,
        subcategoryKey: subcategory.key,
        subcategoryName: subcategory.name,
        itemCount: subcategory.itemCount,
        pieces: subcategory.pieces,
        totalValue: subcategory.totalValue,
        subcategoryCard: subcategory,
      });

      if (!expandedSubcategories.has(expansionKey)) {
        continue;
      }

      const categoryProducts = filterSellProductsByCategoryAndSubcategory(
        products,
        card.id,
        subcategory.key,
      ) as SellProductWithAction[];

      for (const product of categoryProducts) {
        rows.push({
          rowId: `product:${product.id}`,
          type: "product",
          depth: 2,
          categoryId,
          categoryIdNum: card.id,
          categoryName: card.name,
          categoryColor: card.color,
          subcategoryKey: subcategory.key,
          subcategoryName: subcategory.name,
          totalValue: 0,
          product,
        });
      }
    }
  }

  return rows;
}

export function matchesSellHierarchySearch(
  row: SellProductHierarchyRow,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (row.type === "category") {
    const card = row.categoryCard;
    return [card?.name, card?.description, card?.color]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized));
  }

  if (row.type === "subcategory") {
    return [row.subcategoryName, row.subcategoryCard?.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized));
  }

  const product = row.product;
  if (!product) return false;

  return [
    product.name,
    product.internal_code,
    product.description,
    product.subcategory,
    product.type,
    product.tipo,
    product.product_type,
    product.category?.name,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function buildSellSearchExpandedSets(
  categoryCards: SellCategoryCardData[],
  products: SellProductWithAction[],
  query: string,
): {
  categories: Set<string>;
  subcategories: Set<string>;
} {
  const normalized = query.trim().toLowerCase();
  const categories = new Set<string>();
  const subcategories = new Set<string>();

  if (!normalized) {
    return { categories, subcategories };
  }

  for (const card of categoryCards) {
    if (
      [card.name, card.description, card.color]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    ) {
      categories.add(String(card.id));
    }
  }

  for (const product of products) {
    const categoryIdNum = product.category_id ?? product.category?.id;
    if (!categoryIdNum) continue;

    const categoryId = String(categoryIdNum);
    const subcategoryName = String(product.subcategory || product.type || "").trim();
    const subcategoryKey = getSubcategoryKey(
      subcategoryName || EMPTY_SUBCATEGORY_LABEL,
    );

    const productRow: SellProductHierarchyRow = {
      rowId: `product:${product.id}`,
      type: "product",
      depth: 2,
      categoryId,
      categoryIdNum,
      categoryName: product.category?.name ?? "",
      subcategoryKey,
      subcategoryName: subcategoryName || EMPTY_SUBCATEGORY_LABEL,
      product,
    };

    if (matchesSellHierarchySearch(productRow, normalized)) {
      categories.add(categoryId);
      subcategories.add(
        getSellSubcategoryExpansionKey(categoryId, subcategoryKey),
      );
    }
  }

  return { categories, subcategories };
}

export function filterSellHierarchyRowsBySearch(
  rows: SellProductHierarchyRow[],
  query: string,
): SellProductHierarchyRow[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  const matchingCategoryIds = new Set<string>();
  const matchingSubcategoryKeys = new Set<string>();
  const matchingProductIds = new Set<number>();

  for (const row of rows) {
    if (!matchesSellHierarchySearch(row, normalized)) continue;

    if (row.type === "category") {
      matchingCategoryIds.add(row.categoryId);
    } else if (row.type === "subcategory" && row.subcategoryKey) {
      matchingCategoryIds.add(row.categoryId);
      matchingSubcategoryKeys.add(
        getSellSubcategoryExpansionKey(row.categoryId, row.subcategoryKey),
      );
    } else if (row.type === "product" && row.product) {
      matchingCategoryIds.add(row.categoryId);
      if (row.subcategoryKey) {
        matchingSubcategoryKeys.add(
          getSellSubcategoryExpansionKey(row.categoryId, row.subcategoryKey),
        );
      }
      matchingProductIds.add(row.product.id);
    }
  }

  return rows.filter((row) => {
    if (row.type === "category") {
      return matchingCategoryIds.has(row.categoryId);
    }
    if (row.type === "subcategory" && row.subcategoryKey) {
      return matchingSubcategoryKeys.has(
        getSellSubcategoryExpansionKey(row.categoryId, row.subcategoryKey),
      );
    }
    if (row.type === "product" && row.product) {
      return matchingProductIds.has(row.product.id);
    }
    return false;
  });
}

export function getSellHierarchyRowLabel(
  type: SellProductHierarchyRowType,
): string {
  switch (type) {
    case "category":
      return "Categoria";
    case "subcategory":
      return "Sottocategoria";
    case "product":
      return "Prodotto";
  }
}
