import type {
  SellCategoryCardData,
  SellSubcategoryCardData,
} from "@/types/sell-product-category-cards";
import type { SellProductWithAction } from "@/app/sites/[domain]/products/columns";

export type SellProductHierarchyRowType =
  | "category"
  | "subcategory"
  | "product"
  | "productsMore";

/** Numero massimo di prodotti mostrati inline sotto una sottocategoria. */
export const SELL_PRODUCT_PREVIEW_LIMIT = 8;

export interface SellProductHierarchyRow {
  rowId: string;
  type: SellProductHierarchyRowType;
  depth: 0 | 1 | 2;
  categoryId: string;
  categoryIdNum: number;
  categoryName: string;
  categoryColor?: string | null;
  subcategoryKey?: string;
  subcategoryName?: string;
  itemCount?: number;
  subcategoryCount?: number;
  pieces?: number;
  totalValue?: number;
  categoryCard?: SellCategoryCardData;
  subcategoryCard?: SellSubcategoryCardData;
  product?: SellProductWithAction;
}

export function getSellSubcategoryExpansionKey(
  categoryId: string,
  subcategoryKey: string,
): string {
  return `${categoryId}:${subcategoryKey}`;
}
