"use client";

import React, { useState } from "react";
import { Package } from "lucide-react";
import { PageHeader, PageContent } from "@/components/page-layout";
import { EmptyState } from "@/components/layout/empty-state";
import DialogCreate from "./dialogCreate";
import InventoryCategoriesView from "../categories/dataWrapper";
import type {
  CategoryCardData,
  CategoryDrillState,
  CategoryViewMode,
  SubcategoryImageRecord,
} from "@/types/category-cards";
import type { InventoryRow } from "./columns";
import type { InventoryCategory, InventorySupplier } from "@/types/supabase";

interface InventoryPageClientProps {
  pageTitle: string;
  pageSubtitle: string;
  categoryCards: CategoryCardData[];
  categories: InventoryCategory[];
  inventory: InventoryRow[];
  suppliers: InventorySupplier[];
  domain: string;
  initialViewMode: CategoryViewMode;
  subcategoryImages: SubcategoryImageRecord[];
  isAdmin: boolean;
  inventoryData: {
    inventory: InventoryRow[];
    categories: InventoryCategory[];
    suppliers: InventorySupplier[];
  };
}

export function InventoryPageClient({
  pageTitle,
  pageSubtitle,
  categoryCards,
  categories,
  inventory,
  suppliers,
  domain,
  initialViewMode,
  subcategoryImages,
  isAdmin,
  inventoryData,
}: InventoryPageClientProps) {
  const [drill, setDrill] = useState<CategoryDrillState>({ level: "categories" });

  const hasContent =
    categoryCards.length > 0 || categories.length > 0 || inventory.length > 0;

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={<DialogCreate data={inventoryData} />}
      />
      <PageContent>
        {hasContent ? (
          <InventoryCategoriesView
            categoryCards={categoryCards}
            categories={categories}
            inventory={inventory}
            suppliers={suppliers}
            domain={domain}
            initialViewMode={initialViewMode}
            subcategoryImages={subcategoryImages}
            drill={drill}
            onDrillChange={setDrill}
            isAdmin={isAdmin}
            managementMode={false}
          />
        ) : (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="Nessun prodotto registrato"
            description="Premi 'Aggiungi prodotto' per aggiungere il tuo primo prodotto."
          />
        )}
      </PageContent>
    </>
  );
}
