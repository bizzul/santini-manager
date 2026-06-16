"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import AreaTreeDiagram from "@/components/diagram/AreaTreeDiagram";
import { useDiagramFocus } from "@/components/diagram/use-diagram-focus";
import { capPanelRows } from "@/lib/area-tree-diagram";
import type { AreaTreeSector } from "@/lib/area-tree-diagram";
import { categoryIconName } from "@/lib/category-diagram-icons";
import { cn } from "@/lib/utils";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { BrowseViewToolbar } from "@/components/categories/browse-view-toolbar";
import { CategoryViewToggle } from "@/components/categories/category-view-toggle";
import { CategoryCardGrid } from "@/components/categories/category-card-grid";
import { CategoryBreadcrumb } from "@/components/categories/category-breadcrumb";
import { CategoryArticlesTable } from "@/components/categories/category-articles-table";
import { InventoryHierarchicalBrowseTable } from "@/components/categories/inventory-hierarchical-browse-table";
import { DialogCategoryImage } from "@/components/categories/dialog-category-image";
import { DialogSubcategoryImage } from "@/components/categories/dialog-subcategory-image";
import {
  aggregateSubcategoryCards,
  mergeSubcategoryRecords,
} from "@/lib/category-aggregation";
import {
  reorderInventoryCategories,
  reorderInventorySubcategories,
  saveInventoryCategoryViewMode,
} from "@/lib/inventory-category-api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type {
  CategoryCardData,
  CategoryCardGridItem,
  CategoryDrillState,
  CategoryViewMode,
  SubcategoryCardData,
  SubcategoryImageRecord,
} from "@/types/category-cards";
import type { InventoryRow } from "@/app/sites/[domain]/inventory/columns";
import type {
  BrowseDrillToCategoryItemsParams,
  BrowseDrillToItemsParams,
} from "@/types/browse-drill";
import type { InventoryCategory, InventorySupplier } from "@/types/supabase";

interface InventoryCategoriesViewProps {
  categoryCards: CategoryCardData[];
  categories: InventoryCategory[];
  inventory: InventoryRow[];
  suppliers: InventorySupplier[];
  domain: string;
  initialViewMode: CategoryViewMode;
  subcategoryImages: SubcategoryImageRecord[];
  drill: CategoryDrillState;
  onDrillChange: (drill: CategoryDrillState) => void;
  isAdmin: boolean;
  managementMode?: boolean;
  siteId?: string;
  diagramRootLabel?: string;
  diagramRootIcon?: string;
}

const InventoryCategoriesView = ({
  categoryCards,
  categories,
  inventory,
  suppliers,
  domain,
  initialViewMode,
  subcategoryImages,
  drill,
  onDrillChange,
  isAdmin,
  managementMode = true,
  siteId,
  diagramRootLabel = "Magazzino",
  diagramRootIcon = "faWarehouse",
}: InventoryCategoriesViewProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const diagramFocus = useDiagramFocus();
  const [viewMode, setViewMode] = useState<CategoryViewMode>(() =>
    diagramFocus.isDiagram ? "diagram" : initialViewMode,
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [isPersistingView, startPersistTransition] = useTransition();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogCategory, setImageDialogCategory] =
    useState<CategoryCardData | null>(null);
  const [subcategoryImageDialogOpen, setSubcategoryImageDialogOpen] =
    useState(false);
  const [subcategoryImageTarget, setSubcategoryImageTarget] =
    useState<SubcategoryCardData | null>(null);

  const tableColumns = useMemo(
    () =>
      createColumns(domain, {
        canManageImages: isAdmin,
        managementMode,
      }),
    [domain, isAdmin, managementMode],
  );

  const subcategoryCards: SubcategoryCardData[] = useMemo(() => {
    if (!drill.categoryId) return [];
    const cards = aggregateSubcategoryCards(drill.categoryId, inventory);
    const imagesForCategory = subcategoryImages.filter(
      (image) => image.category_id === drill.categoryId,
    );
    return mergeSubcategoryRecords(cards, imagesForCategory);
  }, [drill.categoryId, inventory, subcategoryImages]);

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
    (mode: CategoryViewMode) => {
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
          await saveInventoryCategoryViewMode(domain, mode);
        } catch (error) {
          console.error("Failed to persist category view mode:", error);
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
        level: "articles",
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
      const category = categoryCards.find((card) => card.id === item.id);
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
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));
      try {
        await reorderInventoryCategories(domain, orderedIds);
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
        await reorderInventorySubcategories(
          domain,
          drill.categoryId,
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
      const haystack = [card.name, card.code, card.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [categoryCards, globalFilter]);

  const categoryGridItems = useMemo(
    (): CategoryCardGridItem[] =>
      filteredCategoryCards.map((card) => ({
        id: card.id,
        key: card.id,
        name: card.name,
        code: card.code,
        imageUrl: card.image_url,
        pieces: card.pieces,
        totalValue: card.totalValue,
        itemCount: card.itemCount,
        subcategoryCount: card.subcategoryCount,
        sort_order: card.sort_order,
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
    viewMode === "table" &&
    (drill.level === "categories" || drill.level === "subcategories");

  const handleDrillToArticles = useCallback(
    (params: BrowseDrillToItemsParams) => {
      onDrillChange({
        level: "articles",
        categoryId: params.categoryId,
        categoryName: params.categoryName,
        subcategoryKey: params.subcategoryKey,
        subcategoryName: params.subcategoryName,
      });
    },
    [onDrillChange],
  );

  const handleDrillToCategoryArticles = useCallback(
    (params: BrowseDrillToCategoryItemsParams) => {
      onDrillChange({
        level: "categoryArticles",
        categoryId: params.categoryId,
        categoryName: params.categoryName,
      });
    },
    [onDrillChange],
  );

  const handleCategoryImageBrowse = useCallback(
    (item: CategoryCardGridItem) => {
      if (!item.id) return;
      handleDrillToCategoryArticles({
        categoryId: item.id,
        categoryName: item.name,
      });
    },
    [handleDrillToCategoryArticles],
  );

  const handleSubcategoryImageBrowse = useCallback(
    (item: CategoryCardGridItem) => {
      if (!drill.categoryId || !drill.categoryName) return;
      handleDrillToArticles({
        categoryId: drill.categoryId,
        categoryName: drill.categoryName,
        subcategoryKey: item.key,
        subcategoryName: item.name,
      });
    },
    [drill.categoryId, drill.categoryName, handleDrillToArticles],
  );

  const handleBrowseBack = useCallback(() => {
    if (drill.level === "articles" && drill.categoryId && drill.categoryName) {
      onDrillChange({
        level: "subcategories",
        categoryId: drill.categoryId,
        categoryName: drill.categoryName,
      });
      return;
    }

    if (drill.level === "categoryArticles") {
      onDrillChange({ level: "categories" });
    }
  }, [drill, onDrillChange]);

  const diagramSectors: AreaTreeSector[] = useMemo(() => {
    if (!showAreaTreeDiagram) return [];

    return filteredCategoryCards.map((card) => {
      const categoryItems = inventory.filter(
        (item) => item.category_id === card.id,
      );
      const panelData = capPanelRows(
        categoryItems,
        (item) => ({
          id: item.id,
          label: item.name || item.internal_code || "Articolo",
          onClick: () =>
            router.push(`/sites/${domain}/inventory/edit/${item.item_id}`),
        }),
        () => {
          diagramFocus.clearDiagramParams();
          setViewMode("table");
          onDrillChange({
            level: "categoryArticles",
            categoryId: card.id,
            categoryName: card.name,
          });
        },
      );

      return {
        id: card.id,
        label: card.name,
        badge: String(categoryItems.length),
        icon: categoryIconName(card.name),
        panels: [
          {
            id: "articles",
            rows: panelData.rows,
            moreCount: panelData.moreCount,
            onMore: panelData.onMore,
          },
        ],
      };
    });
  }, [
    diagramFocus,
    domain,
    filteredCategoryCards,
    inventory,
    onDrillChange,
    router,
    showAreaTreeDiagram,
  ]);

  const diagramRoot = useMemo(
    () => ({
      label: diagramRootLabel,
      sublabel: "Giacenze e articoli",
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
          searchPlaceholder="Cerca per codice, nome, descrizione..."
          leading={
            <div className="[&_nav]:mb-0">
              <CategoryBreadcrumb drill={drill} onNavigate={onDrillChange} />
            </div>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CategoryBreadcrumb drill={drill} onNavigate={onDrillChange} />
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
          <InventoryHierarchicalBrowseTable
            categoryCards={categoryCards}
            categories={categories}
            inventory={inventory}
            suppliers={suppliers}
            subcategoryImages={subcategoryImages}
            domain={domain}
            globalFilter={globalFilter}
            focusCategoryId={
              drill.level === "subcategories" ? drill.categoryId : undefined
            }
            onDrillToCategoryItems={handleDrillToCategoryArticles}
            onDrillToItems={handleDrillToArticles}
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
            diagramKey="inventory"
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

      {(drill.level === "articles" || drill.level === "categoryArticles") &&
        drill.categoryId && (
          <CategoryArticlesTable
            inventory={inventory}
            categories={categories}
            suppliers={suppliers}
            categoryId={drill.categoryId}
            categoryName={drill.categoryName}
            subcategoryKey={
              drill.level === "articles" ? drill.subcategoryKey : undefined
            }
            subcategoryName={
              drill.level === "articles" ? drill.subcategoryName : undefined
            }
            subcategoryStats={
              drill.level === "articles" ? activeSubcategory : undefined
            }
            subcategoryImages={subcategoryImages}
            onBack={!managementMode ? handleBrowseBack : undefined}
          />
        )}

      {imageDialogCategory && (
        <DialogCategoryImage
          open={imageDialogOpen}
          onOpenChange={setImageDialogOpen}
          domain={domain}
          categoryId={imageDialogCategory.id}
          categoryName={imageDialogCategory.name}
          currentUrl={imageDialogCategory.image_url}
        />
      )}

      {subcategoryImageTarget && drill.categoryId && drill.categoryName && (
        <DialogSubcategoryImage
          open={subcategoryImageDialogOpen}
          onOpenChange={setSubcategoryImageDialogOpen}
          domain={domain}
          categoryId={drill.categoryId}
          categoryName={drill.categoryName}
          subcategoryKey={subcategoryImageTarget.key}
          subcategoryName={subcategoryImageTarget.name}
          currentUrl={subcategoryImageTarget.image_url}
        />
      )}
    </div>
  );
};

export default InventoryCategoriesView;
