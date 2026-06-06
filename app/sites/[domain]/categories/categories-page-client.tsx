"use client";

import React, { useState } from "react";
import { Folder } from "lucide-react";

import { PageHeader, PageContent } from "@/components/page-layout";
import { PageTitle } from "@/components/ui/typography";
import { EmptyState } from "@/components/layout/empty-state";
import DialogCreate from "./dialogCreate";
import DialogCreateSubcategory from "./dialogCreateSubcategory";
import DataWrapper from "./dataWrapper";
import type {
  CategoryCardData,
  CategoryDrillState,
  CategoryViewMode,
  SubcategoryImageRecord,
} from "@/types/category-cards";
import type { InventoryRow } from "@/app/sites/[domain]/inventory/columns";
import type { InventoryCategory, InventorySupplier } from "@/types/supabase";

interface CategoriesPageClientProps {
  categoryCards: CategoryCardData[];
  categories: InventoryCategory[];
  inventory: InventoryRow[];
  suppliers: InventorySupplier[];
  domain: string;
  initialViewMode: CategoryViewMode;
  subcategoryImages: SubcategoryImageRecord[];
  isAdmin: boolean;
}

export function CategoriesPageClient({
  categoryCards,
  categories,
  inventory,
  suppliers,
  domain,
  initialViewMode,
  subcategoryImages,
  isAdmin,
}: CategoriesPageClientProps) {
  const [drill, setDrill] = useState<CategoryDrillState>({ level: "categories" });

  const isSubcategoryView =
    drill.level === "subcategories" &&
    Boolean(drill.categoryId) &&
    Boolean(drill.categoryName);

  const headerActions = isSubcategoryView ? (
    <DialogCreateSubcategory
      domain={domain}
      categoryId={drill.categoryId!}
      categoryName={drill.categoryName!}
      canManageImages={isAdmin}
    />
  ) : (
    <DialogCreate domain={domain} canManageImages={isAdmin} />
  );

  return (
    <>
      <PageHeader
        title={
          isSubcategoryView ? (
            <PageTitle>
              Sottocategoria{" "}
              <span className="text-primary">{drill.categoryName}</span>
            </PageTitle>
          ) : (
            "Categorie"
          )
        }
        subtitle={
          isSubcategoryView
            ? "Organizza le sottocategorie del materiale presente in Magazzino"
            : "Organizza le categorie del materiale presente in Magazzino"
        }
        actions={headerActions}
      />
      <PageContent>
        {categoryCards.length > 0 ? (
          <DataWrapper
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
          />
        ) : (
          <EmptyState
            icon={<Folder className="h-6 w-6" />}
            title="Nessuna categoria registrata"
            description="Premi 'Aggiungi categoria' per creare la prima categoria."
          />
        )}
      </PageContent>
    </>
  );
}
