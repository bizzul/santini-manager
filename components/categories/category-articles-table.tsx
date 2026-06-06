"use client";

import { useMemo } from "react";
import { DataTable } from "@/app/sites/[domain]/inventory/table";
import {
  createColumns,
  type InventoryRow,
} from "@/app/sites/[domain]/inventory/columns";
import { EmptyState } from "@/components/layout/empty-state";
import { Package } from "lucide-react";
import type { InventoryCategory, InventorySupplier } from "@/types/supabase";
import type {
  SubcategoryCardData,
  SubcategoryImageRecord,
} from "@/types/category-cards";
import {
  countMergedSubcategories,
  filterInventoryByCategory,
  filterInventoryByCategoryAndSubcategory,
} from "@/lib/category-aggregation";
import {
  formatCategoryPieces,
  formatCategoryStatsLine,
  formatCategoryValue,
  formatSubcategoryStatsLine,
} from "@/lib/category-display";

interface CategoryArticlesTableProps {
  inventory: InventoryRow[];
  categories: InventoryCategory[];
  suppliers: InventorySupplier[];
  categoryId: string;
  categoryName?: string;
  subcategoryKey?: string;
  subcategoryName?: string;
  subcategoryStats?: SubcategoryCardData | null;
  subcategoryImages?: SubcategoryImageRecord[];
  onBack?: () => void;
}

export function CategoryArticlesTable({
  inventory,
  categories,
  suppliers,
  categoryId,
  categoryName,
  subcategoryKey,
  subcategoryName,
  subcategoryStats,
  subcategoryImages = [],
  onBack,
}: CategoryArticlesTableProps) {
  const columns = useMemo(
    () =>
      createColumns(undefined, suppliers, {
        subcategoryColumnTitle: "Categoria",
      }),
    [suppliers],
  );

  const isCategoryScope = !subcategoryKey;

  const filteredInventory = useMemo(() => {
    if (isCategoryScope) {
      return filterInventoryByCategory(inventory, categoryId) as InventoryRow[];
    }
    return filterInventoryByCategoryAndSubcategory(
      inventory,
      categoryId,
      subcategoryKey,
    ) as InventoryRow[];
  }, [inventory, categoryId, subcategoryKey, isCategoryScope]);

  const subcategoryCount = useMemo(() => {
    if (!isCategoryScope) return 0;
    const records = subcategoryImages.filter(
      (image) => image.category_id === categoryId,
    );
    return countMergedSubcategories(categoryId, inventory, records);
  }, [categoryId, inventory, isCategoryScope, subcategoryImages]);

  const stats = useMemo(() => {
    if (subcategoryStats) return subcategoryStats;
    const pieces = filteredInventory.reduce(
      (sum, row) => sum + (row.stock_quantity ?? row.quantity ?? 0),
      0,
    );
    const totalValue = filteredInventory.reduce((sum, row) => {
      const qty = row.stock_quantity ?? row.quantity ?? 0;
      const price = row.purchase_unit_price ?? row.unit_price ?? 0;
      return sum + qty * price;
    }, 0);
    return {
      key: subcategoryKey ?? categoryId,
      name: subcategoryName ?? categoryName ?? "Categoria",
      pieces,
      totalValue,
      itemCount: filteredInventory.length,
    };
  }, [
    subcategoryStats,
    filteredInventory,
    subcategoryKey,
    subcategoryName,
    categoryName,
    categoryId,
  ]);

  if (filteredInventory.length === 0) {
    const scopeLabel = subcategoryName ?? categoryName ?? "questa categoria";
    return (
      <EmptyState
        icon={<Package className="h-6 w-6" />}
        title={
          isCategoryScope
            ? "Nessun articolo in questa categoria"
            : "Nessun articolo in questa sottocategoria"
        }
        description={`Non ci sono articoli registrati per "${scopeLabel}".`}
      />
    );
  }

  return (
    <div className="space-y-3">
      {isCategoryScope ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{categoryName}</p>
          <p className="text-muted-foreground">
            {formatCategoryStatsLine(stats.itemCount, subcategoryCount)} ·{" "}
            {formatCategoryPieces(stats.pieces)} pezzi ·{" "}
            {formatCategoryValue(stats.totalValue)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {formatSubcategoryStatsLine(stats.itemCount)} ·{" "}
          {formatCategoryPieces(stats.pieces)} pezzi ·{" "}
          {formatCategoryValue(stats.totalValue)}
        </p>
      )}
      <DataTable
        columns={columns}
        data={filteredInventory}
        categories={categories}
        embeddedMode
        embeddedColumnPreset="categoryDrilldown"
        onBack={onBack}
      />
    </div>
  );
}
