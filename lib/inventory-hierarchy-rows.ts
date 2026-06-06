import {
  aggregateSubcategoryCards,
  countMergedSubcategories,
  EMPTY_SUBCATEGORY_LABEL,
  filterInventoryByCategoryAndSubcategory,
  getSubcategoryKey,
  mergeSubcategoryRecords,
} from "@/lib/category-aggregation";
import type { CategoryCardData, SubcategoryImageRecord } from "@/types/category-cards";
import type {
  InventoryHierarchyRow,
  InventoryHierarchyRowType,
} from "@/types/inventory-hierarchy";
import { getSubcategoryExpansionKey } from "@/types/inventory-hierarchy";
import type { InventoryRow } from "@/app/sites/[domain]/inventory/columns";

export interface BuildHierarchyRowsInput {
  categoryCards: CategoryCardData[];
  inventory: InventoryRow[];
  subcategoryImages: SubcategoryImageRecord[];
  expandedCategories: ReadonlySet<string>;
  expandedSubcategories: ReadonlySet<string>;
  visibleCategoryIds?: ReadonlySet<string> | null;
}

function getArticleTotalValue(article: InventoryRow): number {
  const unitPrice = article.purchase_unit_price ?? article.unit_price ?? 0;
  const qty = article.stock_quantity ?? article.quantity ?? 0;
  return unitPrice * qty;
}

export function buildVisibleHierarchyRows(
  input: BuildHierarchyRowsInput,
): InventoryHierarchyRow[] {
  const {
    categoryCards,
    inventory,
    subcategoryImages,
    expandedCategories,
    expandedSubcategories,
    visibleCategoryIds,
  } = input;

  const rows: InventoryHierarchyRow[] = [];

  const visibleCards = visibleCategoryIds
    ? categoryCards.filter((card) => visibleCategoryIds.has(card.id))
    : categoryCards;

  for (const card of visibleCards) {
    const categorySubcategoryImages = subcategoryImages.filter(
      (image) => image.category_id === card.id,
    );
    const totalSubcategoryCount = countMergedSubcategories(
      card.id,
      inventory,
      categorySubcategoryImages,
    );

    rows.push({
      rowId: `category:${card.id}`,
      type: "category",
      depth: 0,
      categoryId: card.id,
      categoryName: card.name,
      categoryCode: card.code,
      itemCount: card.itemCount,
      subcategoryCount: totalSubcategoryCount,
      pieces: card.pieces,
      totalValue: card.totalValue,
      categoryCard: card,
    });

    if (!expandedCategories.has(card.id)) {
      continue;
    }

    const subcategoryCards = mergeSubcategoryRecords(
      aggregateSubcategoryCards(card.id, inventory),
      categorySubcategoryImages,
    );

    for (const subcategory of subcategoryCards) {
      const expansionKey = getSubcategoryExpansionKey(card.id, subcategory.key);

      rows.push({
        rowId: `subcategory:${expansionKey}`,
        type: "subcategory",
        depth: 1,
        categoryId: card.id,
        categoryName: card.name,
        categoryCode: card.code,
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

      const articles = filterInventoryByCategoryAndSubcategory(
        inventory,
        card.id,
        subcategory.key,
      ) as InventoryRow[];

      for (const article of articles) {
        rows.push({
          rowId: `article:${article.id}`,
          type: "article",
          depth: 2,
          categoryId: card.id,
          categoryName: card.name,
          categoryCode: card.code,
          subcategoryKey: subcategory.key,
          subcategoryName: subcategory.name,
          totalValue: getArticleTotalValue(article),
          article,
        });
      }
    }
  }

  return rows;
}

export function matchesHierarchySearch(
  row: InventoryHierarchyRow,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (row.type === "category") {
    const card = row.categoryCard;
    return [card?.name, card?.code, card?.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized));
  }

  if (row.type === "subcategory") {
    return [row.subcategoryName, row.subcategoryCard?.description]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalized));
  }

  const article = row.article;
  if (!article) return false;

  return [
    article.name,
    article.internal_code,
    article.warehouse_number,
    article.supplier?.name,
    article.color,
    article.subcategory,
    article.attributes?.subcategory,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function buildSearchExpandedSets(
  categoryCards: CategoryCardData[],
  inventory: InventoryRow[],
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
      [card.name, card.code, card.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    ) {
      categories.add(card.id);
    }
  }

  for (const article of inventory) {
    const categoryId = article.category_id ?? article.category?.id;
    if (!categoryId) continue;

    const subcategoryName =
      article.subcategory ??
      (article.attributes?.subcategory as string | undefined) ??
      "";
    const subcategoryKey = getSubcategoryKey(
      String(subcategoryName).trim() || EMPTY_SUBCATEGORY_LABEL,
    );

    const articleRow: InventoryHierarchyRow = {
      rowId: `article:${article.id}`,
      type: "article",
      depth: 2,
      categoryId,
      categoryName: article.category?.name ?? "",
      subcategoryKey,
      subcategoryName: String(subcategoryName).trim() || EMPTY_SUBCATEGORY_LABEL,
      article,
    };

    if (matchesHierarchySearch(articleRow, normalized)) {
      categories.add(categoryId);
      subcategories.add(getSubcategoryExpansionKey(categoryId, subcategoryKey));
    }
  }

  return { categories, subcategories };
}

export function filterHierarchyRowsBySearch(
  rows: InventoryHierarchyRow[],
  query: string,
): InventoryHierarchyRow[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;

  const matchingCategoryIds = new Set<string>();
  const matchingSubcategoryKeys = new Set<string>();
  const matchingArticleIds = new Set<string>();

  for (const row of rows) {
    if (!matchesHierarchySearch(row, normalized)) continue;

    if (row.type === "category") {
      matchingCategoryIds.add(row.categoryId);
    } else if (row.type === "subcategory" && row.subcategoryKey) {
      matchingCategoryIds.add(row.categoryId);
      matchingSubcategoryKeys.add(
        getSubcategoryExpansionKey(row.categoryId, row.subcategoryKey),
      );
    } else if (row.type === "article" && row.article) {
      matchingCategoryIds.add(row.categoryId);
      if (row.subcategoryKey) {
        matchingSubcategoryKeys.add(
          getSubcategoryExpansionKey(row.categoryId, row.subcategoryKey),
        );
      }
      matchingArticleIds.add(row.article.id);
    }
  }

  return rows.filter((row) => {
    if (row.type === "category") {
      return matchingCategoryIds.has(row.categoryId);
    }
    if (row.type === "subcategory" && row.subcategoryKey) {
      return matchingSubcategoryKeys.has(
        getSubcategoryExpansionKey(row.categoryId, row.subcategoryKey),
      );
    }
    if (row.type === "article" && row.article) {
      return matchingArticleIds.has(row.article.id);
    }
    return false;
  });
}

export function getHierarchyRowLabel(type: InventoryHierarchyRowType): string {
  switch (type) {
    case "category":
      return "Categoria";
    case "subcategory":
      return "Sottocategoria";
    case "article":
      return "Articolo";
  }
}
