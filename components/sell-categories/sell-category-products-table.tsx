"use client";

import { useMemo } from "react";
import { DataTable } from "@/app/sites/[domain]/products/table";
import {
  createColumns,
  type SellProductWithAction,
} from "@/app/sites/[domain]/products/columns";
import { EmptyState } from "@/components/layout/empty-state";
import { Package } from "lucide-react";
import type { SellProductCategory } from "@/types/supabase";
import type {
  SellSubcategoryCardData,
  SellSubcategoryImageRecord,
} from "@/types/sell-product-category-cards";
import {
  countMergedSellSubcategories,
  filterSellProductsByCategory,
  filterSellProductsByCategoryAndSubcategory,
} from "@/lib/sell-product-category-aggregation";
import {
  formatCategoryStatsLine,
  formatSubcategoryStatsLine,
} from "@/lib/category-display";

interface SellCategoryProductsTableProps {
  products: SellProductWithAction[];
  categories: SellProductCategory[];
  categoryId: number;
  categoryName?: string;
  subcategoryKey?: string;
  subcategoryName?: string;
  subcategoryStats?: SellSubcategoryCardData | null;
  subcategoryImages?: SellSubcategoryImageRecord[];
  domain: string;
  onBack?: () => void;
}

export function SellCategoryProductsTable({
  products,
  categories,
  categoryId,
  categoryName,
  subcategoryKey,
  subcategoryName,
  subcategoryStats,
  subcategoryImages = [],
  domain,
  onBack,
}: SellCategoryProductsTableProps) {
  const columns = useMemo(
    () =>
      createColumns(domain, {
        subcategoryColumnTitle: "Categoria",
      }),
    [domain],
  );

  const isCategoryScope = !subcategoryKey;

  const filteredProducts = useMemo(() => {
    if (isCategoryScope) {
      return filterSellProductsByCategory(
        products,
        categoryId,
      ) as SellProductWithAction[];
    }
    return filterSellProductsByCategoryAndSubcategory(
      products,
      categoryId,
      subcategoryKey,
    ) as SellProductWithAction[];
  }, [products, categoryId, subcategoryKey, isCategoryScope]);

  const subcategoryCount = useMemo(() => {
    if (!isCategoryScope) return 0;
    const records = subcategoryImages.filter(
      (image) => image.category_id === categoryId,
    );
    return countMergedSellSubcategories(categoryId, products, records);
  }, [categoryId, products, isCategoryScope, subcategoryImages]);

  const stats = subcategoryStats ?? {
    key: subcategoryKey ?? String(categoryId),
    name: subcategoryName ?? categoryName ?? "Categoria",
    pieces: filteredProducts.length,
    totalValue: 0,
    itemCount: filteredProducts.length,
  };

  if (filteredProducts.length === 0) {
    const scopeLabel = subcategoryName ?? categoryName ?? "questa categoria";
    return (
      <EmptyState
        icon={<Package className="h-6 w-6" />}
        title={
          isCategoryScope
            ? "Nessun prodotto in questa categoria"
            : "Nessun prodotto in questa sottocategoria"
        }
        description={`Non ci sono prodotti registrati per "${scopeLabel}".`}
      />
    );
  }

  return (
    <div className="space-y-3">
      {isCategoryScope ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">{categoryName}</p>
          <p className="text-muted-foreground">
            {formatCategoryStatsLine(stats.itemCount, subcategoryCount)}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            {subcategoryName ?? categoryName}
          </p>
          <p className="text-muted-foreground">
            {formatSubcategoryStatsLine(stats.itemCount)}
          </p>
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredProducts}
        domain={domain}
        categories={categories}
        embeddedMode
        embeddedColumnPreset="categoryDrilldown"
        onBack={onBack}
      />
    </div>
  );
}
