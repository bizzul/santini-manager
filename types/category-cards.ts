import type { InventoryCategory } from "@/types/supabase";

export type CategoryViewMode = "table" | "grid" | "diagram";

export const INVENTORY_CATEGORIES_VIEW_MODE_KEY = "inventory_categories_view_mode";

export interface CategoryCardData extends Pick<
  InventoryCategory,
  "id" | "name" | "code" | "description" | "image_url" | "sort_order"
> {
  pieces: number;
  totalValue: number;
  itemCount: number;
  subcategoryCount: number;
}

export interface SubcategoryCardData {
  key: string;
  name: string;
  pieces: number;
  totalValue: number;
  itemCount: number;
  image_url?: string | null;
  description?: string | null;
  sort_order?: number;
}

export interface SubcategoryImageRecord {
  category_id: string;
  subcategory_key: string;
  subcategory_name: string;
  image_url: string | null;
  description?: string | null;
  sort_order?: number;
}

export type CategoryDrillLevel =
  | "categories"
  | "subcategories"
  | "articles"
  | "categoryArticles";

export interface CategoryDrillState {
  level: CategoryDrillLevel;
  categoryId?: string;
  categoryName?: string;
  subcategoryKey?: string;
  subcategoryName?: string;
}

export type CategoryCardSortField =
  | "custom"
  | "name"
  | "pieces"
  | "totalValue"
  | "itemCount";

export type CategoryTableRow = CategoryCardData;

export interface CategoryCardGridItem {
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
