import type { SellProductCategory } from "@/types/supabase";

export type SellCategoryViewMode = "table" | "grid";

export const SELL_PRODUCT_CATEGORIES_VIEW_MODE_KEY =
  "sell_product_categories_view_mode";

export interface SellCategoryCardData extends Pick<
  SellProductCategory,
  "id" | "name" | "description" | "color" | "image_url" | "sort_order"
> {
  itemCount: number;
  subcategoryCount: number;
  pieces: number;
  totalValue: number;
}

export interface SellSubcategoryCardData {
  key: string;
  name: string;
  pieces: number;
  totalValue: number;
  itemCount: number;
  image_url?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface SellSubcategoryImageRecord {
  category_id: number;
  subcategory_key: string;
  subcategory_name: string;
  image_url: string | null;
  description?: string | null;
  sort_order?: number;
}

export type SellCategoryDrillLevel =
  | "categories"
  | "subcategories"
  | "products"
  | "categoryProducts";

export interface SellCategoryDrillState {
  level: SellCategoryDrillLevel;
  categoryId?: string;
  categoryName?: string;
  subcategoryKey?: string;
  subcategoryName?: string;
}

export type SellCategoryCardSortField =
  | "custom"
  | "name"
  | "pieces"
  | "totalValue"
  | "itemCount";

export type SellCategoryTableRow = SellCategoryCardData;

export interface SellCategoryCardGridItem {
  id?: string;
  key: string;
  name: string;
  code?: string | null;
  imageUrl?: string | null;
  pieces: number;
  totalValue: number;
  itemCount?: number;
  subcategoryCount?: number;
  sort_order?: number;
  accentColor?: string | null;
  categoryId?: string;
  subcategoryKey?: string;
}
