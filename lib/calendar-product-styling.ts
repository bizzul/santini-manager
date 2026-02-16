/**
 * Calendar event styling based on product category (like Kanban Posa)
 * Used for colors and icons per product type in production/installation/service calendars
 */

import type { LucideIcon } from "lucide-react";
import { Sofa, DoorOpen, LayoutGrid, Wrench, Tag } from "lucide-react";

export interface ProductCategoryInfo {
  id?: number;
  name?: string | null;
  color?: string | null;
}

export interface TaskWithProductCategory {
  SellProduct?: {
    name?: string | null;
    type?: string | null;
    category?: ProductCategoryInfo | null;
  } | null;
  sellProduct?: {
    name?: string | null;
    type?: string | null;
    category?: ProductCategoryInfo | null;
  } | null;
  sell_product?: {
    name?: string | null;
    type?: string | null;
    category?: ProductCategoryInfo | null;
  } | null;
}

// Icon mapping by category name (same as Kanban Card)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  arredamento: Sofa,
  porte: DoorOpen,
  serramenti: LayoutGrid,
  accessori: Wrench,
};

const DEFAULT_CATEGORY_ICON = Tag;

export function getProductCategoryIcon(
  categoryName?: string | null
): LucideIcon {
  if (!categoryName) return DEFAULT_CATEGORY_ICON;
  const normalizedName = categoryName.toLowerCase().trim();
  return CATEGORY_ICONS[normalizedName] || DEFAULT_CATEGORY_ICON;
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Get event style (backgroundColor, textColor) from task's product category.
 * Falls back to kanbanColor when no product category.
 */
export function getEventStyleFromProduct(
  task: TaskWithProductCategory | null,
  kanbanColor: string = "#1e293b"
): { backgroundColor: string; borderColor: string; textColor: string } {
  const sellProduct = task?.SellProduct || task?.sellProduct || task?.sell_product;
  const category = sellProduct?.category;
  const categoryColor = category?.color;

  if (!categoryColor) {
    return {
      backgroundColor: kanbanColor,
      borderColor: kanbanColor,
      textColor: getContrastColor(kanbanColor),
    };
  }

  return {
    backgroundColor: categoryColor,
    borderColor: categoryColor,
    textColor: getContrastColor(categoryColor),
  };
}
