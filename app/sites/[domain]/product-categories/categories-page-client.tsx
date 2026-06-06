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
  SellCategoryCardData,
  SellCategoryDrillState,
  SellCategoryViewMode,
  SellSubcategoryImageRecord,
} from "@/types/sell-product-category-cards";
import type { SellProductWithAction } from "@/app/sites/[domain]/products/columns";
import type { SellProductCategory } from "@/types/supabase";

interface CategoriesPageClientProps {
  categoryCards: SellCategoryCardData[];
  categories: SellProductCategory[];
  products: SellProductWithAction[];
  domain: string;
  initialViewMode: SellCategoryViewMode;
  subcategoryImages: SellSubcategoryImageRecord[];
  isAdmin: boolean;
}

export function CategoriesPageClient({
  categoryCards,
  categories,
  products,
  domain,
  initialViewMode,
  subcategoryImages,
  isAdmin,
}: CategoriesPageClientProps) {
  const [drill, setDrill] = useState<SellCategoryDrillState>({
    level: "categories",
  });

  const isSubcategoryView =
    drill.level === "subcategories" &&
    Boolean(drill.categoryId) &&
    Boolean(drill.categoryName);

  const headerActions = isSubcategoryView ? (
    <DialogCreateSubcategory
      domain={domain}
      categoryId={Number(drill.categoryId)}
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
            "Categorie Articoli"
          )
        }
        subtitle={
          isSubcategoryView
            ? "Organizza le sottocategorie degli articoli destinati alla vendita"
            : "Organizza le categorie degli articoli destinati alla vendita"
        }
        actions={headerActions}
      />
      <PageContent>
        {categoryCards.length > 0 || categories.length > 0 ? (
          <DataWrapper
            categoryCards={categoryCards}
            categories={categories}
            products={products}
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
            title="Nessuna categoria articolo registrata"
            description="Premi 'Aggiungi categoria' per creare la prima categoria."
          />
        )}
      </PageContent>
    </>
  );
}
