import { parseFocusPath } from "@/lib/diagram-focus";
import type { CategoryDrillState } from "@/types/category-cards";
import type { SellCategoryDrillState } from "@/types/sell-product-category-cards";

function resolveCategoryName(
  categoryId: string,
  names: Map<string, string>,
): string {
  return names.get(categoryId) ?? "Categoria";
}

export function sellDrillFromFocus(
  focus: string | null | undefined,
  categoryNameById: Map<string, string>,
  subcategoryNameByKey?: Map<string, string>,
): SellCategoryDrillState {
  const segments = parseFocusPath(focus);
  const catSegment = segments.find((segment) => segment.type === "cat");
  const subSegment = segments.find((segment) => segment.type === "sub");

  if (!catSegment) {
    return { level: "categories" };
  }

  const categoryId = catSegment.value;
  const categoryName = resolveCategoryName(categoryId, categoryNameById);

  if (subSegment) {
    return {
      level: "products",
      categoryId,
      categoryName,
      subcategoryKey: subSegment.value,
      subcategoryName:
        subcategoryNameByKey?.get(subSegment.value) ?? subSegment.value,
    };
  }

  return {
    level: "subcategories",
    categoryId,
    categoryName,
  };
}

export function inventoryDrillFromFocus(
  focus: string | null | undefined,
  categoryNameById: Map<string, string>,
  subcategoryNameByKey?: Map<string, string>,
): CategoryDrillState {
  const segments = parseFocusPath(focus);
  const catSegment = segments.find((segment) => segment.type === "cat");
  const subSegment = segments.find((segment) => segment.type === "sub");

  if (!catSegment) {
    return { level: "categories" };
  }

  const categoryId = catSegment.value;
  const categoryName = resolveCategoryName(categoryId, categoryNameById);

  if (subSegment) {
    return {
      level: "articles",
      categoryId,
      categoryName,
      subcategoryKey: subSegment.value,
      subcategoryName:
        subcategoryNameByKey?.get(subSegment.value) ?? subSegment.value,
    };
  }

  return {
    level: "subcategories",
    categoryId,
    categoryName,
  };
}
