"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BrowseCategoryFilter } from "@/components/categories/browse-category-filter";
import { InventoryHierarchyExportButton } from "@/components/categories/inventory-hierarchy-export-button";
import { DataTableRowActions } from "@/app/sites/[domain]/inventory/data-table-row-actions";
import { useCategoryIdFilter } from "@/hooks/use-category-id-filter";
import {
  buildSearchExpandedSets,
  buildVisibleHierarchyRows,
  filterHierarchyRowsBySearch,
} from "@/lib/inventory-hierarchy-rows";
import {
  formatCategoryPieces,
  formatCategoryValue,
} from "@/lib/category-display";
import { getSubcategoryExpansionKey } from "@/types/inventory-hierarchy";
import type { InventoryHierarchyRow } from "@/types/inventory-hierarchy";
import type {
  CategoryCardData,
  SubcategoryImageRecord,
} from "@/types/category-cards";
import type { InventoryRow } from "@/app/sites/[domain]/inventory/columns";
import type {
  BrowseDrillToCategoryItemsParams,
  BrowseDrillToItemsParams,
} from "@/types/browse-drill";
import { HierarchyImagePreview } from "@/components/categories/hierarchy-image-preview";
import type { InventoryCategory, InventorySupplier } from "@/types/supabase";
import type { Row } from "@tanstack/react-table";
import { HierarchyLeadingCell } from "@/components/categories/hierarchy-leading-cell";
import { TableColGroup } from "@/components/table/table-colgroup";
import {
  HIERARCHY_SUMMARY_COLUMNS,
  getTableCellClasses,
  getTableHeadClasses,
} from "@/lib/table-layout-presets";
import { cn } from "@/lib/utils";

interface InventoryHierarchicalBrowseTableProps {
  categoryCards: CategoryCardData[];
  categories: InventoryCategory[];
  inventory: InventoryRow[];
  suppliers: InventorySupplier[];
  subcategoryImages: SubcategoryImageRecord[];
  domain: string;
  globalFilter: string;
  focusCategoryId?: string;
  onDrillToCategoryItems?: (params: BrowseDrillToCategoryItemsParams) => void;
  onDrillToItems?: (params: BrowseDrillToItemsParams) => void;
}

function formatArticleDimensions(article: InventoryRow): string {
  const parts = [
    article.width,
    article.height,
    article.length,
    article.thickness,
    article.diameter,
  ].filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  return parts.length > 0 ? parts.join("×") : "—";
}

function formatArticleQuantity(article: InventoryRow): string {
  const qty = article.stock_quantity ?? article.quantity ?? 0;
  const unit = article.unit?.code || article.attributes?.legacy_unit || "";
  return unit ? `${qty} ${unit}` : String(qty);
}

function HierarchyExpandButton({
  isExpanded,
  hasChildren,
  onToggle,
}: {
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
}) {
  if (!hasChildren) {
    return <span className="inline-block h-8 w-8" aria-hidden="true" />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-expanded={isExpanded}
    >
      {isExpanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </Button>
  );
}

function CategoryRowCells({
  row,
  isExpanded,
  onToggle,
  onDrillToCategoryItems,
  domain,
}: {
  row: InventoryHierarchyRow;
  isExpanded: boolean;
  onToggle: () => void;
  onDrillToCategoryItems?: (params: BrowseDrillToCategoryItemsParams) => void;
  domain: string;
}) {
  const card = row.categoryCard;
  const hasChildren = (row.subcategoryCount ?? 0) > 0 || (row.itemCount ?? 0) > 0;

  return (
    <>
      <TableCell className={getTableCellClasses("leading")}>
        <HierarchyLeadingCell depth={row.depth}>
          <HierarchyExpandButton
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            onToggle={onToggle}
          />
          <HierarchyImagePreview
            imageUrl={card?.image_url}
            label={row.categoryName}
            onOpenList={
              onDrillToCategoryItems
                ? () =>
                    onDrillToCategoryItems({
                      categoryId: row.categoryId,
                      categoryName: row.categoryName,
                    })
                : undefined
            }
          />
        </HierarchyLeadingCell>
      </TableCell>
      <TableCell className={getTableCellClasses("code")}>
        {card?.code ?? "—"}
      </TableCell>
      <TableCell className={getTableCellClasses("name")}>
        {row.categoryName}
      </TableCell>
      <TableCell
        className={cn(
          getTableCellClasses("descriptionFlex"),
          "text-muted-foreground",
        )}
      >
        {card?.description ?? "—"}
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>
        {row.itemCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>
        {row.subcategoryCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {formatCategoryPieces(row.pieces ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("currency")}>
        {formatCategoryValue(row.totalValue ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("actions")}>
        <InventoryHierarchyExportButton
          domain={domain}
          filter={{
            categoryId: row.categoryId,
            categoryCode: row.categoryCode,
            categoryName: row.categoryName,
          }}
          label="Esporta"
        />
      </TableCell>
    </>
  );
}

function SubcategoryRowCells({
  row,
  isExpanded,
  onToggle,
  onDrillToItems,
  domain,
}: {
  row: InventoryHierarchyRow;
  isExpanded: boolean;
  onToggle: () => void;
  onDrillToItems?: (params: BrowseDrillToItemsParams) => void;
  domain: string;
}) {
  const hasChildren = (row.itemCount ?? 0) > 0;

  return (
    <>
      <TableCell className={getTableCellClasses("leading")}>
        <HierarchyLeadingCell depth={row.depth}>
          <HierarchyExpandButton
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            onToggle={onToggle}
          />
          <HierarchyImagePreview
            imageUrl={row.subcategoryCard?.image_url}
            label={row.subcategoryName ?? row.subcategoryKey ?? ""}
            onOpenList={
              onDrillToItems && row.subcategoryKey
                ? () =>
                    onDrillToItems({
                      categoryId: row.categoryId,
                      categoryName: row.categoryName,
                      subcategoryKey: row.subcategoryKey!,
                      subcategoryName:
                        row.subcategoryName ?? row.subcategoryKey!,
                    })
                : undefined
            }
          />
        </HierarchyLeadingCell>
      </TableCell>
      <TableCell className={getTableCellClasses("code")}>—</TableCell>
      <TableCell className={getTableCellClasses("name")}>
        {onDrillToItems && row.subcategoryKey ? (
          <button
            type="button"
            className="w-full truncate text-left font-medium hover:underline"
            title="Apri elenco articoli"
            onClick={(event) => {
              event.stopPropagation();
              onDrillToItems({
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                subcategoryKey: row.subcategoryKey!,
                subcategoryName: row.subcategoryName ?? row.subcategoryKey!,
              });
            }}
          >
            {row.subcategoryName}
          </button>
        ) : (
          row.subcategoryName
        )}
      </TableCell>
      <TableCell
        className={cn(
          getTableCellClasses("descriptionFlex"),
          "text-muted-foreground",
        )}
      >
        {row.subcategoryCard?.description ?? "—"}
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>
        {row.itemCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>—</TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {formatCategoryPieces(row.pieces ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("currency")}>
        {formatCategoryValue(row.totalValue ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("actions")}>
        <InventoryHierarchyExportButton
          domain={domain}
          filter={{
            categoryId: row.categoryId,
            categoryCode: row.categoryCode,
            categoryName: row.categoryName,
            subcategoryKey: row.subcategoryKey,
          }}
          subcategoryName={row.subcategoryName}
          label="Esporta"
        />
      </TableCell>
    </>
  );
}

function ArticleRowCells({ row }: { row: InventoryHierarchyRow }) {
  const article = row.article;
  if (!article) return null;

  const detailParts = [
    article.color,
    article.supplier?.name,
    formatArticleDimensions(article),
  ].filter(Boolean);

  return (
    <>
      <TableCell className={getTableCellClasses("leading")}>
        <HierarchyLeadingCell depth={row.depth} />
      </TableCell>
      <TableCell className={getTableCellClasses("code")}>—</TableCell>
      <TableCell className={getTableCellClasses("name")}>
        {article.name}
      </TableCell>
      <TableCell
        className={cn(
          getTableCellClasses("descriptionFlex"),
          "text-muted-foreground",
        )}
      >
        {detailParts.length > 0 ? detailParts.join(" · ") : "—"}
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>—</TableCell>
      <TableCell className={getTableCellClasses("metric")}>—</TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {formatArticleQuantity(article)}
      </TableCell>
      <TableCell className={getTableCellClasses("currency")}>
        {formatCategoryValue(row.totalValue ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("actions")}>
        <div onClick={(event) => event.stopPropagation()}>
          <DataTableRowActions
            row={{ original: article } as Row<InventoryRow>}
          />
        </div>
      </TableCell>
    </>
  );
}

export function InventoryHierarchicalBrowseTable({
  categoryCards,
  categories,
  inventory,
  subcategoryImages,
  domain,
  globalFilter,
  focusCategoryId,
  onDrillToCategoryItems,
  onDrillToItems,
}: InventoryHierarchicalBrowseTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => (focusCategoryId ? new Set([focusCategoryId]) : new Set()),
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());

  const categoryIds = useMemo(
    () => categories.map((category) => category.id),
    [categories],
  );

  const {
    selectedIds,
    allSelected,
    isSomeSelected,
    toggle,
    toggleAll,
  } = useCategoryIdFilter(categoryIds);

  useEffect(() => {
    if (!focusCategoryId) return;
    setExpandedCategories(
      (prev) => new Set([...Array.from(prev), focusCategoryId]),
    );
  }, [focusCategoryId]);

  const visibleCategoryIds = useMemo(() => {
    if (focusCategoryId) return new Set([focusCategoryId]);
    if (allSelected) return null;
    if (selectedIds.length === 0) return new Set<string>();
    return new Set(selectedIds);
  }, [focusCategoryId, allSelected, selectedIds]);

  const browseFilterItems = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code,
      })),
    [categories],
  );

  const searchExpansion = useMemo(
    () => buildSearchExpandedSets(categoryCards, inventory, globalFilter),
    [categoryCards, inventory, globalFilter],
  );

  const hasSearch = globalFilter.trim().length > 0;

  const effectiveExpandedCategories = useMemo(() => {
    if (!hasSearch) return expandedCategories;
    return new Set([
      ...Array.from(expandedCategories),
      ...Array.from(searchExpansion.categories),
    ]);
  }, [hasSearch, expandedCategories, searchExpansion.categories]);

  const effectiveExpandedSubcategories = useMemo(() => {
    if (!hasSearch) return expandedSubcategories;
    return new Set([
      ...Array.from(expandedSubcategories),
      ...Array.from(searchExpansion.subcategories),
    ]);
  }, [hasSearch, expandedSubcategories, searchExpansion.subcategories]);

  const hierarchyRows = useMemo(
    () =>
      buildVisibleHierarchyRows({
        categoryCards,
        inventory,
        subcategoryImages,
        expandedCategories: effectiveExpandedCategories,
        expandedSubcategories: effectiveExpandedSubcategories,
        visibleCategoryIds,
      }),
    [
      categoryCards,
      inventory,
      subcategoryImages,
      effectiveExpandedCategories,
      effectiveExpandedSubcategories,
      visibleCategoryIds,
    ],
  );

  const filteredRows = useMemo(
    () => filterHierarchyRowsBySearch(hierarchyRows, globalFilter),
    [hierarchyRows, globalFilter],
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const toggleSubcategory = useCallback(
    (categoryId: string, subcategoryKey: string) => {
      const key = getSubcategoryExpansionKey(categoryId, subcategoryKey);
      setExpandedSubcategories((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [],
  );

  const renderRow = (row: InventoryHierarchyRow) => {
    const rowClassName = cn(
      row.type === "category" && "bg-muted/20 font-medium",
      row.type === "subcategory" && "bg-muted/10",
      row.type === "article" && "text-sm",
    );

    if (row.type === "category") {
      const isExpanded = expandedCategories.has(row.categoryId);
      return (
        <TableRow key={row.rowId} className={rowClassName}>
          <CategoryRowCells
            row={row}
            isExpanded={isExpanded}
            onToggle={() => toggleCategory(row.categoryId)}
            onDrillToCategoryItems={onDrillToCategoryItems}
            domain={domain}
          />
        </TableRow>
      );
    }

    if (row.type === "subcategory" && row.subcategoryKey) {
      const expansionKey = getSubcategoryExpansionKey(
        row.categoryId,
        row.subcategoryKey,
      );
      const isExpanded = expandedSubcategories.has(expansionKey);
      return (
        <TableRow key={row.rowId} className={rowClassName}>
          <SubcategoryRowCells
            row={row}
            isExpanded={isExpanded}
            onToggle={() =>
              toggleSubcategory(row.categoryId, row.subcategoryKey!)
            }
            onDrillToItems={onDrillToItems}
            domain={domain}
          />
        </TableRow>
      );
    }

    return (
      <TableRow key={row.rowId} className={rowClassName}>
        <ArticleRowCells row={row} />
      </TableRow>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-2">
      {!focusCategoryId && categories.length > 0 ? (
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <BrowseCategoryFilter
            variant="cards"
            categories={browseFilterItems}
            allSelected={allSelected}
            selectedIds={selectedIds}
            isSomeSelected={isSomeSelected}
            onToggleAll={toggleAll}
            onToggle={toggle}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <Table className="w-max max-w-full table-fixed">
          <TableColGroup columns={HIERARCHY_SUMMARY_COLUMNS} />
          <TableHeader>
            <TableRow>
              {HIERARCHY_SUMMARY_COLUMNS.map((column) => (
                <TableHead
                  key={column.id}
                  className={getTableHeadClasses(column.role)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.map(renderRow)
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  Nessun risultato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
