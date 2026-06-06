"use client";

import React, { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import DialogCreate from "./dialogCreate";
import DialogImportCSV from "./dialogImportCSV";
import ButtonExportCSV from "./buttonExportCSV";
import SellCategoriesView from "../product-categories/dataWrapper";
import type {
  SellCategoryCardData,
  SellCategoryDrillState,
  SellCategoryViewMode,
  SellSubcategoryImageRecord,
} from "@/types/sell-product-category-cards";
import type { SellProductWithAction } from "./columns";
import type { SellProductCategory } from "@/types/supabase";

interface ProductsPageClientProps {
  pageTitle: string;
  pageSubtitle: string;
  categoryCards: SellCategoryCardData[];
  categories: SellProductCategory[];
  products: SellProductWithAction[];
  domain: string;
  siteId: string;
  initialViewMode: SellCategoryViewMode;
  subcategoryImages: SellSubcategoryImageRecord[];
  isAdmin: boolean;
}

export function ProductsPageClient({
  pageTitle,
  pageSubtitle,
  categoryCards,
  categories,
  products,
  domain,
  siteId,
  initialViewMode,
  subcategoryImages,
  isAdmin,
}: ProductsPageClientProps) {
  const [drill, setDrill] = useState<SellCategoryDrillState>({
    level: "categories",
  });

  const hasContent =
    categoryCards.length > 0 || categories.length > 0 || products.length > 0;

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <div className="flex gap-2">
            <ButtonExportCSV />
            <DialogImportCSV />
            <DialogCreate domain={domain} siteId={siteId} />
          </div>
        }
      />
      <PageContent>
        {hasContent ? (
          <SellCategoriesView
            categoryCards={categoryCards}
            categories={categories}
            products={products}
            domain={domain}
            initialViewMode={initialViewMode}
            subcategoryImages={subcategoryImages}
            drill={drill}
            onDrillChange={setDrill}
            isAdmin={isAdmin}
            managementMode={false}
            siteId={siteId}
          />
        ) : (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="Nessun articolo registrato"
            description="Premi 'Aggiungi articolo' per aggiungere il tuo primo articolo."
          />
        )}
      </PageContent>
    </>
  );
}
