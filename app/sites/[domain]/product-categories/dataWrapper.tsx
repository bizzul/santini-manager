"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import AreaTreeDiagram from "@/components/diagram/AreaTreeDiagram";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { capPanelRows } from "@/lib/area-tree-diagram";
import type { AreaTreeSector } from "@/lib/area-tree-diagram";
import { categoryIconName } from "@/lib/category-diagram-icons";
import { cn } from "@/lib/utils";
import { getSellProductDisplayCode } from "@/lib/sell-product-code";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { BrowseViewToolbar } from "@/components/categories/browse-view-toolbar";
import { CategoryViewToggle } from "@/components/categories/category-view-toggle";
import { CategoryCardGrid } from "@/components/categories/category-card-grid";
import { SellCategoryBreadcrumb } from "@/components/sell-categories/sell-category-breadcrumb";
import { SellCategoryProductsTable } from "@/components/sell-categories/sell-category-products-table";
import { SellProductHierarchicalBrowseTable } from "@/components/sell-categories/sell-product-hierarchical-browse-table";
import { DialogSellCategoryImage } from "@/components/sell-categories/dialog-sell-category-image";
import { DialogSellSubcategoryImage } from "@/components/sell-categories/dialog-sell-subcategory-image";
import {
  aggregateSellSubcategoryCards,
  mergeSellSubcategoryRecords,
} from "@/lib/sell-product-category-aggregation";
import {
  reorderSellProductCategories,
  reorderSellProductSubcategories,
  saveSellProductCategoryViewMode,
} from "@/lib/sell-product-category-api";
import type { CategoryCardGridItem } from "@/types/category-cards";
import type {
  SellCategoryCardData,
  SellCategoryDrillState,
  SellCategoryViewMode,
  SellSubcategoryCardData,
  SellSubcategoryImageRecord,
} from "@/types/sell-product-category-cards";
import type { SellProductWithAction } from "@/app/sites/[domain]/products/columns";
import type {
  BrowseDrillToCategoryItemsParams,
  BrowseDrillToItemsParams,
} from "@/types/browse-drill";
import type { SellProductCategory } from "@/types/supabase";

interface SellCategoriesViewProps {
  categoryCards: SellCategoryCardData[];
  categories: SellProductCategory[];
  products: SellProductWithAction[];
  domain: string;
  initialViewMode: SellCategoryViewMode;
  subcategoryImages: SellSubcategoryImageRecord[];
  drill: SellCategoryDrillState;
  onDrillChange: (drill: SellCategoryDrillState) => void;
  isAdmin: boolean;
  managementMode?: boolean;
  siteId?: string;
  diagramRootLabel?: string;
  diagramRootIcon?: string;
}

const SellCategoriesView = ({
  categoryCards,
  categories,
  products,
  domain,
  initialViewMode,
  subcategoryImages,
  drill,
  onDrillChange,
  isAdmin,
  managementMode = true,
  siteId,
  diagramRootLabel = "Prodotti",
  diagramRootIcon = "faBox",
}: SellCategoriesViewProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const diagramFocus = useDiagramFocus();
  const [viewMode, setViewMode] = useState<SellCategoryViewMode>(() =>
    diagramFocus.isDiagram ? "diagram" : initialViewMode,
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [isPersistingView, startPersistTransition] = useTransition();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogCategory, setImageDialogCategory] =
    useState<SellCategoryCardData | null>(null);
  const [subcategoryImageDialogOpen, setSubcategoryImageDialogOpen] =
    useState(false);
  const [subcategoryImageTarget, setSubcategoryImageTarget] =
    useState<SellSubcategoryCardData | null>(null);

  const tableColumns = useMemo(
    () =>
      createColumns(domain, {
        canManageImages: isAdmin,
        managementMode,
      }),
    [domain, isAdmin, managementMode],
  );

  const subcategoryCards: SellSubcategoryCardData[] = useMemo(() => {
    if (!drill.categoryId) return [];
    const categoryId = Number(drill.categoryId);
    const cards = aggregateSellSubcategoryCards(categoryId, products);
    const imagesForCategory = subcategoryImages.filter(
      (image) => image.category_id === categoryId,
    );
    return mergeSellSubcategoryRecords(cards, imagesForCategory);
  }, [drill.categoryId, products, subcategoryImages]);

  const activeSubcategory = useMemo(
    () =>
      subcategoryCards.find((card) => card.key === drill.subcategoryKey) ?? null,
    [subcategoryCards, drill.subcategoryKey],
  );

  useEffect(() => {
    if (managementMode) return;
    if (diagramFocus.isDiagram) {
      setViewMode("diagram");
      onDrillChange({ level: "categories" });
    }
  }, [managementMode, diagramFocus.isDiagram, onDrillChange]);

  const handleViewModeChange = useCallback(
    (mode: SellCategoryViewMode) => {
      setViewMode(mode);
      if (!managementMode) {
        if (mode === "diagram") {
          diagramFocus.setView("diagram");
          return;
        }
        diagramFocus.clearDiagramParams();
      }
      if (mode === "diagram") return;
      startPersistTransition(async () => {
        try {
          await saveSellProductCategoryViewMode(domain, mode);
        } catch (error) {
          console.error("Failed to persist sell category view mode:", error);
        }
      });
    },
    [domain, diagramFocus, managementMode],
  );

  const handleCategoryCardClick = useCallback(
    (item: CategoryCardGridItem) => {
      if (!item.id) return;
      if (!managementMode && viewMode === "diagram") {
        diagramFocus.pushFocus({ type: "cat", value: item.id });
        return;
      }
      onDrillChange({
        level: "subcategories",
        categoryId: item.id,
        categoryName: item.name,
      });
    },
    [diagramFocus, managementMode, onDrillChange, viewMode],
  );

  const handleSubcategoryCardClick = useCallback(
    (item: CategoryCardGridItem) => {
      if (!drill.categoryId || !drill.categoryName) return;
      if (!managementMode && viewMode === "diagram") {
        diagramFocus.pushFocus({ type: "sub", value: item.key });
        return;
      }
      onDrillChange({
        level: "products",
        categoryId: drill.categoryId,
        categoryName: drill.categoryName,
        subcategoryKey: item.key,
        subcategoryName: item.name,
      });
    },
    [
      diagramFocus,
      drill.categoryId,
      drill.categoryName,
      managementMode,
      onDrillChange,
      viewMode,
    ],
  );

  const handleImageAction = useCallback(
    (item: CategoryCardGridItem) => {
      if (!isAdmin || !item.id) return;
      const category = categoryCards.find(
        (card) => String(card.id) === item.id,
      );
      if (!category) return;
      setImageDialogCategory(category);
      setImageDialogOpen(true);
    },
    [categoryCards, isAdmin],
  );

  const handleSubcategoryImageAction = useCallback(
    (item: CategoryCardGridItem) => {
      if (!isAdmin || !drill.categoryId) return;
      setSubcategoryImageTarget({
        key: item.key,
        name: item.name,
        pieces: item.pieces,
        totalValue: item.totalValue,
        itemCount: item.itemCount ?? 0,
        image_url: item.imageUrl,
      });
      setSubcategoryImageDialogOpen(true);
    },
    [drill.categoryId, isAdmin],
  );

  const handleCategoryReorder = useCallback(
    async (items: CategoryCardGridItem[]) => {
      const orderedIds = items
        .map((item) => Number(item.id))
        .filter((id) => Number.isInteger(id) && id > 0);
      try {
        await reorderSellProductCategories(domain, orderedIds);
        router.refresh();
      } catch (error) {
        toast({
          description:
            error instanceof Error
              ? error.message
              : "Errore durante il riordino delle categorie",
        });
        throw error;
      }
    },
    [domain, router, toast],
  );

  const handleSubcategoryReorder = useCallback(
    async (items: CategoryCardGridItem[]) => {
      if (!drill.categoryId) return;
      try {
        await reorderSellProductSubcategories(
          domain,
          Number(drill.categoryId),
          items.map((item) => ({
            subcategory_key: item.key,
            subcategory_name: item.name,
          })),
        );
        router.refresh();
      } catch (error) {
        toast({
          description:
            error instanceof Error
              ? error.message
              : "Errore durante il riordino delle sottocategorie",
        });
        throw error;
      }
    },
    [domain, drill.categoryId, router, toast],
  );

  const filteredCategoryCards = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();
    if (!query) return categoryCards;

    return categoryCards.filter((card) => {
      const haystack = [card.name, card.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [categoryCards, globalFilter]);

  const categoryGridItems = useMemo(
    (): CategoryCardGridItem[] =>
      filteredCategoryCards.map((card) => ({
        id: String(card.id),
        key: String(card.id),
        name: card.name,
        imageUrl: card.image_url,
        pieces: card.pieces,
        totalValue: card.totalValue,
        itemCount: card.itemCount,
        subcategoryCount: card.subcategoryCount,
        sort_order: card.sort_order,
        accentColor: card.color,
      })),
    [filteredCategoryCards],
  );

  const subcategoryGridItems = useMemo(
    (): CategoryCardGridItem[] =>
      subcategoryCards.map((card) => ({
        key: card.key,
        name: card.name,
        imageUrl: card.image_url,
        pieces: card.pieces,
        totalValue: card.totalValue,
        itemCount: card.itemCount,
        sort_order: card.sort_order,
        categoryId: drill.categoryId,
        subcategoryKey: card.key,
      })),
    [subcategoryCards, drill.categoryId],
  );

  const showCategoryGrid =
    viewMode === "grid" && drill.level === "categories";
  const showSubcategoryGrid =
    viewMode === "grid" && drill.level === "subcategories";
  const showAreaTreeDiagram =
    viewMode === "diagram" && drill.level === "categories";
  const showHierarchicalTable =
    !managementMode &&
    siteId &&
    viewMode === "table" &&
    (drill.level === "categories" || drill.level === "subcategories");

  const handleDrillToProducts = useCallback(
    (params: BrowseDrillToItemsParams) => {
      onDrillChange({
        level: "products",
        categoryId: params.categoryId,
        categoryName: params.categoryName,
        subcategoryKey: params.subcategoryKey,
        subcategoryName: params.subcategoryName,
      });
    },
    [onDrillChange],
  );

  const handleDrillToCategoryProducts = useCallback(
    (params: BrowseDrillToCategoryItemsParams) => {
      onDrillChange({
        level: "categoryProducts",
        categoryId: params.categoryId,
        categoryName: params.categoryName,
      });
    },
    [onDrillChange],
  );

  const handleCategoryImageBrowse = useCallback(
    (item: CategoryCardGridItem) => {
      if (!item.id) return;
      handleDrillToCategoryProducts({
        categoryId: item.id,
        categoryName: item.name,
      });
    },
    [handleDrillToCategoryProducts],
  );

  const handleSubcategoryImageBrowse = useCallback(
    (item: CategoryCardGridItem) => {
      if (!drill.categoryId || !drill.categoryName) return;
      handleDrillToProducts({
        categoryId: drill.categoryId,
        categoryName: drill.categoryName,
        subcategoryKey: item.key,
        subcategoryName: item.name,
      });
    },
    [drill.categoryId, drill.categoryName, handleDrillToProducts],
  );

  const handleBrowseBack = useCallback(() => {
    if (drill.level === "products" && drill.categoryId && drill.categoryName) {
      onDrillChange({
        level: "subcategories",
        categoryId: drill.categoryId,
        categoryName: drill.categoryName,
      });
      return;
    }

    if (drill.level === "categoryProducts") {
      onDrillChange({ level: "categories" });
    }
  }, [drill, onDrillChange]);

  const diagramSectors: AreaTreeSector[] = useMemo(() => {
    if (!showAreaTreeDiagram) return [];

    return filteredCategoryCards.map((card) => {
      const categoryProducts = products.filter(
        (product) => product.category_id === card.id,
      );
      const panelData = capPanelRows(
        categoryProducts,
        (product) => ({
          id: String(product.id),
          label: product.name || getSellProductDisplayCode(product),
          onClick: () => router.push(`/sites/${domain}/products/${product.id}`),
        }),
        () => {
          diagramFocus.clearDiagramParams();
          setViewMode("table");
          onDrillChange({
            level: "categoryProducts",
            categoryId: String(card.id),
            categoryName: card.name,
          });
        },
      );

      const storedIcon = categories.find((c) => c.id === card.id)?.icon;

      return {
        id: String(card.id),
        label: card.name,
        badge: String(categoryProducts.length),
        color: card.color ?? undefined,
        icon: categoryIconName(card.name, storedIcon),
        panels: [
          {
            id: "products",
            rows: panelData.rows,
            moreCount: panelData.moreCount,
            onMore: panelData.onMore,
          },
        ],
      };
    });
  }, [
    categories,
    diagramFocus,
    domain,
    filteredCategoryCards,
    onDrillChange,
    products,
    router,
    showAreaTreeDiagram,
  ]);

  const diagramRoot = useMemo(
    () => ({
      label: diagramRootLabel,
      sublabel: "Catalogo articoli",
      icon: diagramRootIcon,
    }),
    [diagramRootIcon, diagramRootLabel],
  );

  return (
    <div
      className={cn(
        "w-full min-w-0",
        showAreaTreeDiagram
          ? "flex h-full min-h-0 flex-col gap-3"
          : "space-y-3",
      )}
    >
      {!managementMode ? (
        <BrowseViewToolbar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          viewToggleDisabled={isPersistingView}
          showDiagramToggle
          backDomain={domain}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          searchPlaceholder="Cerca per nome o descrizione..."
          leading={
            <div className="[&_nav]:mb-0">
              <SellCategoryBreadcrumb drill={drill} onNavigate={onDrillChange} />
            </div>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SellCategoryBreadcrumb drill={drill} onNavigate={onDrillChange} />
          {drill.level === "categories" && (
            <CategoryViewToggle
              value={viewMode}
              onChange={handleViewModeChange}
              disabled={isPersistingView}
            />
          )}
        </div>
      )}

      {showHierarchicalTable && (
          <SellProductHierarchicalBrowseTable
            categoryCards={categoryCards}
            categories={categories}
            products={products}
            subcategoryImages={subcategoryImages}
            domain={domain}
            siteId={siteId}
            globalFilter={globalFilter}
            focusCategoryId={
              drill.level === "subcategories" ? drill.categoryId : undefined
            }
            onDrillToCategoryItems={handleDrillToCategoryProducts}
            onDrillToItems={handleDrillToProducts}
          />
        )}

      {managementMode && drill.level === "categories" && viewMode === "table" && (
        <DataTable
          columns={tableColumns}
          data={categoryCards}
          domain={domain}
        />
      )}

      {showAreaTreeDiagram && (
        <div className="min-h-0 flex-1">
          <AreaTreeDiagram
            root={diagramRoot}
            sectors={diagramSectors}
            siteId={siteId}
            diagramKey="products"
          />
        </div>
      )}

      {showCategoryGrid && (
        <CategoryCardGrid
          items={categoryGridItems}
          onCardClick={handleCategoryCardClick}
          onImageAction={isAdmin ? handleImageAction : undefined}
          onImageBrowse={
            !managementMode ? handleCategoryImageBrowse : undefined
          }
          imageBrowseTitle="Apri elenco prodotti"
          sortable={isAdmin}
          onReorder={isAdmin ? handleCategoryReorder : undefined}
          emptyTitle="Nessuna categoria trovata"
          emptyDescription="Non ci sono categorie da mostrare."
        />
      )}

      {showSubcategoryGrid && (
        <CategoryCardGrid
          items={subcategoryGridItems}
          onCardClick={handleSubcategoryCardClick}
          onImageAction={isAdmin ? handleSubcategoryImageAction : undefined}
          onImageBrowse={
            !managementMode ? handleSubcategoryImageBrowse : undefined
          }
          imageBrowseTitle="Apri elenco prodotti"
          sortable={isAdmin}
          onReorder={isAdmin ? handleSubcategoryReorder : undefined}
          showSubcategoryStatsOnly
          emptyTitle="Nessuna sottocategoria trovata"
          emptyDescription={
            drill.categoryName
              ? managementMode
                ? `La categoria "${drill.categoryName}" non contiene ancora sottocategorie. Usa "Aggiungi sottocategoria" per crearne una.`
                : `La categoria "${drill.categoryName}" non contiene ancora sottocategorie.`
              : "Non ci sono sottocategorie da mostrare."
          }
        />
      )}

      {(drill.level === "products" || drill.level === "categoryProducts") &&
        drill.categoryId && (
          <SellCategoryProductsTable
            products={products}
            categories={categories}
            categoryId={Number(drill.categoryId)}
            categoryName={drill.categoryName}
            subcategoryKey={
              drill.level === "products" ? drill.subcategoryKey : undefined
            }
            subcategoryName={
              drill.level === "products" ? drill.subcategoryName : undefined
            }
            subcategoryStats={
              drill.level === "products" ? activeSubcategory : undefined
            }
            subcategoryImages={subcategoryImages}
            domain={domain}
            onBack={!managementMode ? handleBrowseBack : undefined}
          />
        )}

      {imageDialogCategory && (
        <DialogSellCategoryImage
          open={imageDialogOpen}
          onOpenChange={setImageDialogOpen}
          domain={domain}
          categoryId={imageDialogCategory.id}
          categoryName={imageDialogCategory.name}
          currentUrl={imageDialogCategory.image_url}
        />
      )}

      {subcategoryImageTarget && drill.categoryId && drill.categoryName && (
        <DialogSellSubcategoryImage
          open={subcategoryImageDialogOpen}
          onOpenChange={setSubcategoryImageDialogOpen}
          domain={domain}
          categoryId={Number(drill.categoryId)}
          categoryName={drill.categoryName}
          subcategoryKey={subcategoryImageTarget.key}
          subcategoryName={subcategoryImageTarget.name}
          currentUrl={subcategoryImageTarget.image_url}
        />
      )}
    </div>
  );
};

export default SellCategoriesView;
