import type { CategoryCardData, SubcategoryCardData } from "@/types/category-cards";
import type { InventoryRow } from "@/app/sites/[domain]/inventory/columns";

export type InventoryHierarchyRowType = "category" | "subcategory" | "article";

export interface InventoryHierarchyRow {
  rowId: string;
  type: InventoryHierarchyRowType;
  depth: 0 | 1 | 2;
  categoryId: string;
  categoryName: string;
  categoryCode?: string | null;
  subcategoryKey?: string;
  subcategoryName?: string;
  itemCount?: number;
  subcategoryCount?: number;
  pieces?: number;
  totalValue?: number;
  categoryCard?: CategoryCardData;
  subcategoryCard?: SubcategoryCardData;
  article?: InventoryRow;
}

export function getSubcategoryExpansionKey(
  categoryId: string,
  subcategoryKey: string,
): string {
  return `${categoryId}:${subcategoryKey}`;
}
