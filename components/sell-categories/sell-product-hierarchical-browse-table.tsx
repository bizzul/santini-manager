"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BrowseCategoryFilter } from "@/components/categories/browse-category-filter";
import { SellProductHierarchyExportButton } from "@/components/sell-categories/sell-product-hierarchy-export-button";
import { DataTableRowActions } from "@/app/sites/[domain]/products/data-table-row-actions";
import { useCategoryIdFilter } from "@/hooks/use-category-id-filter";
import {
  buildSellSearchExpandedSets,
  buildVisibleSellHierarchyRows,
  filterSellHierarchyRowsByMissingPrices,
  filterSellHierarchyRowsBySearch,
} from "@/lib/sell-product-hierarchy-rows";
import {
  formatSellCatalogSummary,
  getPriceStatus,
  getPriceStatusBadgeVariant,
} from "@/lib/sell-product-variant-display";
import { formatCategoryPieces } from "@/lib/category-display";
import { getSellSubcategoryExpansionKey } from "@/types/sell-product-hierarchy";
import type { SellProductHierarchyRow } from "@/types/sell-product-hierarchy";
import type {
  SellCategoryCardData,
  SellSubcategoryImageRecord,
} from "@/types/sell-product-category-cards";
import type { SellProductWithAction } from "@/app/sites/[domain]/products/columns";
import type {
  BrowseDrillToCategoryItemsParams,
  BrowseDrillToItemsParams,
} from "@/types/browse-drill";
import { HierarchyImagePreview } from "@/components/categories/hierarchy-image-preview";
import type { SellProductCategory } from "@/types/supabase";
import type { Row } from "@tanstack/react-table";
import { getSellProductDisplayCode } from "@/lib/sell-product-code";
import {
  deriveGlassLabel,
  deriveMaterialLabel,
} from "@/lib/sell-product-variant-display";
import { HierarchyLeadingCell } from "@/components/categories/hierarchy-leading-cell";
import { TableColGroup } from "@/components/table/table-colgroup";
import {
  SELL_HIERARCHY_SUMMARY_COLUMNS,
  getTableCellClasses,
  getTableHeadClasses,
} from "@/lib/table-layout-presets";
import { cn } from "@/lib/utils";

interface SellProductHierarchicalBrowseTableProps {
  categoryCards: SellCategoryCardData[];
  categories: SellProductCategory[];
  products: SellProductWithAction[];
  subcategoryImages: SellSubcategoryImageRecord[];
  domain: string;
  siteId: string;
  globalFilter: string;
  focusCategoryId?: string;
  onDrillToCategoryItems?: (params: BrowseDrillToCategoryItemsParams) => void;
  onDrillToItems?: (params: BrowseDrillToItemsParams) => void;
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

function MissingPriceBadge({
  missing,
  total,
}: {
  missing: number;
  total: number;
}) {
  if (total <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const status = getPriceStatus(missing, total);
  const variant = getPriceStatusBadgeVariant(status);
  const title =
    missing > 0
      ? `${missing} di ${total} prodotti senza listino`
      : `Listino completo (${total} prodotti)`;

  return (
    <Badge variant={variant} title={title} className="tabular-nums">
      {missing}
    </Badge>
  );
}

function CategoryRowCells({
  row,
  isExpanded,
  onToggle,
  onDrillToCategoryItems,
  siteId,
}: {
  row: SellProductHierarchyRow;
  isExpanded: boolean;
  onToggle: () => void;
  onDrillToCategoryItems?: (params: BrowseDrillToCategoryItemsParams) => void;
  siteId: string;
}) {
  const card = row.categoryCard;
  const hasChildren =
    (row.subcategoryCount ?? 0) > 0 || (row.itemCount ?? 0) > 0;
  const summary = formatSellCatalogSummary(
    card?.materialLabels ?? [],
    card?.variantLabels ?? [],
  );

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
            openListTitle="Apri elenco prodotti"
            onOpenList={
              onDrillToCategoryItems
                ? () =>
                    onDrillToCategoryItems({
                      categoryId: String(row.categoryIdNum),
                      categoryName: row.categoryName,
                    })
                : undefined
            }
          />
        </HierarchyLeadingCell>
      </TableCell>
      <TableCell className={getTableCellClasses("nameWrap")}>
        {row.categoryName}
      </TableCell>
      <TableCell
        className={cn(getTableCellClasses("textFixed"), "text-muted-foreground")}
      >
        —
      </TableCell>
      <TableCell
        className={cn(
          getTableCellClasses("descriptionFlex"),
          "text-muted-foreground",
        )}
      >
        <span className="block truncate" title={summary}>
          {summary}
        </span>
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>
        {row.itemCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {card?.variantCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("badge")}>
        <MissingPriceBadge
          missing={card?.missingPriceCount ?? 0}
          total={row.itemCount ?? 0}
        />
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>
        {row.subcategoryCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {formatCategoryPieces(row.pieces ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("actions")}>
        <SellProductHierarchyExportButton
          siteId={siteId}
          filter={{
            categoryId: row.categoryIdNum,
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
  siteId,
}: {
  row: SellProductHierarchyRow;
  isExpanded: boolean;
  onToggle: () => void;
  onDrillToItems?: (params: BrowseDrillToItemsParams) => void;
  siteId: string;
}) {
  const hasChildren = (row.itemCount ?? 0) > 0;
  const summary =
    row.subcategoryCard?.description?.trim() ||
    formatSellCatalogSummary(
      row.subcategoryCard?.materialLabels ?? [],
      row.subcategoryCard?.variantLabels ?? [],
    );

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
            openListTitle="Apri elenco prodotti"
            onOpenList={
              onDrillToItems && row.subcategoryKey
                ? () =>
                    onDrillToItems({
                      categoryId: String(row.categoryIdNum),
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
      <TableCell className={getTableCellClasses("nameWrap")}>
        {onDrillToItems && row.subcategoryKey ? (
          <button
            type="button"
            className="w-full whitespace-normal break-words text-left font-medium hover:underline"
            title="Apri elenco prodotti"
            onClick={(event) => {
              event.stopPropagation();
              onDrillToItems({
                categoryId: String(row.categoryIdNum),
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
        className={cn(getTableCellClasses("textFixed"), "text-muted-foreground")}
      >
        —
      </TableCell>
      <TableCell
        className={cn(
          getTableCellClasses("descriptionFlex"),
          "text-muted-foreground",
        )}
      >
        <span className="block truncate" title={summary}>
          {summary}
        </span>
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>
        {row.itemCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {row.subcategoryCard?.variantCount ?? 0}
      </TableCell>
      <TableCell className={getTableCellClasses("badge")}>
        <MissingPriceBadge
          missing={row.subcategoryCard?.missingPriceCount ?? 0}
          total={row.itemCount ?? 0}
        />
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>—</TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>
        {formatCategoryPieces(row.pieces ?? 0)}
      </TableCell>
      <TableCell className={getTableCellClasses("actions")}>
        <SellProductHierarchyExportButton
          siteId={siteId}
          filter={{
            categoryId: row.categoryIdNum,
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

function ProductRowCells({
  row,
  domain,
}: {
  row: SellProductHierarchyRow;
  domain: string;
}) {
  const product = row.product;
  if (!product) return null;

  const displayCode = getSellProductDisplayCode(product);

  const detailParts = [
    product.tipo || product.product_type,
    deriveMaterialLabel(product),
    deriveGlassLabel(product),
    product.subcategory || product.type,
    product.description,
  ].filter(Boolean);

  return (
    <>
      <TableCell className={getTableCellClasses("leading")}>
        <HierarchyLeadingCell depth={row.depth} />
      </TableCell>
      <TableCell className={getTableCellClasses("nameWrap")}>
        {product.name}
      </TableCell>
      <TableCell className={getTableCellClasses("textFixed")}>
        {displayCode ? (
          <Link
            href={`/sites/${domain}/products/${product.id}`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="truncate">{displayCode}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
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
      <TableCell className={getTableCellClasses("metricWide")}>—</TableCell>
      <TableCell className={getTableCellClasses("badge")}>
        <Badge
          variant={product.price_list ? "success" : "destructive"}
          title={product.price_list ? "A listino" : "Listino da definire"}
        >
          {product.price_list ? "Sì" : "No"}
        </Badge>
      </TableCell>
      <TableCell className={getTableCellClasses("metric")}>—</TableCell>
      <TableCell className={getTableCellClasses("metricWide")}>—</TableCell>
      <TableCell className={getTableCellClasses("actions")}>
        <div onClick={(event) => event.stopPropagation()}>
          <DataTableRowActions
            row={{ original: product } as Row<SellProductWithAction>}
            domain={domain}
          />
        </div>
      </TableCell>
    </>
  );
}

function ProductsMoreRowCells({
  row,
  onDrillToItems,
}: {
  row: SellProductHierarchyRow;
  onDrillToItems?: (params: BrowseDrillToItemsParams) => void;
}) {
  const total = row.itemCount ?? 0;
  const canDrill = Boolean(onDrillToItems && row.subcategoryKey);

  return (
    <>
      <TableCell className={getTableCellClasses("leading")}>
        <HierarchyLeadingCell depth={row.depth} />
      </TableCell>
      <TableCell
        className={cn(getTableCellClasses("descriptionFlex"), "text-sm")}
        colSpan={SELL_HIERARCHY_SUMMARY_COLUMNS.length - 1}
      >
        {canDrill ? (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              onDrillToItems!({
                categoryId: String(row.categoryIdNum),
                categoryName: row.categoryName,
                subcategoryKey: row.subcategoryKey!,
                subcategoryName: row.subcategoryName ?? row.subcategoryKey!,
              });
            }}
          >
            Mostra tutti i {total} prodotti
          </button>
        ) : (
          <span className="text-muted-foreground">
            {total} prodotti in questa sottocategoria
          </span>
        )}
      </TableCell>
    </>
  );
}

export function SellProductHierarchicalBrowseTable({
  categoryCards,
  categories,
  products,
  subcategoryImages,
  domain,
  siteId,
  globalFilter,
  focusCategoryId,
  onDrillToCategoryItems,
  onDrillToItems,
}: SellProductHierarchicalBrowseTableProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => (focusCategoryId ? new Set([focusCategoryId]) : new Set()),
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());
  const [onlyMissingPrices, setOnlyMissingPrices] = useState(false);

  const categoryIds = useMemo(
    () => categories.map((category) => String(category.id)),
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
        id: String(category.id),
        name: category.name,
        color: category.color,
      })),
    [categories],
  );

  const searchExpansion = useMemo(
    () => buildSellSearchExpandedSets(categoryCards, products, globalFilter),
    [categoryCards, products, globalFilter],
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
      buildVisibleSellHierarchyRows({
        categoryCards,
        products,
        subcategoryImages,
        expandedCategories: effectiveExpandedCategories,
        expandedSubcategories: effectiveExpandedSubcategories,
        visibleCategoryIds,
      }),
    [
      categoryCards,
      products,
      subcategoryImages,
      effectiveExpandedCategories,
      effectiveExpandedSubcategories,
      visibleCategoryIds,
    ],
  );

  const filteredRows = useMemo(() => {
    const searched = filterSellHierarchyRowsBySearch(
      hierarchyRows,
      globalFilter,
    );
    return onlyMissingPrices
      ? filterSellHierarchyRowsByMissingPrices(searched)
      : searched;
  }, [hierarchyRows, globalFilter, onlyMissingPrices]);

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
      const key = getSellSubcategoryExpansionKey(categoryId, subcategoryKey);
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

  const renderRow = (row: SellProductHierarchyRow) => {
    const rowClassName = cn(
      row.type === "category" && "bg-muted/20 font-medium",
      row.type === "subcategory" && "bg-muted/10",
      row.type === "product" && "text-sm",
      row.type === "productsMore" && "bg-muted/5",
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
            siteId={siteId}
          />
        </TableRow>
      );
    }

    if (row.type === "subcategory" && row.subcategoryKey) {
      const expansionKey = getSellSubcategoryExpansionKey(
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
            siteId={siteId}
          />
        </TableRow>
      );
    }

    if (row.type === "productsMore") {
      return (
        <TableRow key={row.rowId} className={rowClassName}>
          <ProductsMoreRowCells row={row} onDrillToItems={onDrillToItems} />
        </TableRow>
      );
    }

    return (
      <TableRow key={row.rowId} className={rowClassName}>
        <ProductRowCells row={row} domain={domain} />
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

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={onlyMissingPrices}
          onCheckedChange={(checked) => setOnlyMissingPrices(checked === true)}
          aria-label="Mostra solo sottocategorie con prezzi mancanti"
        />
        Solo sottocategorie con prezzi mancanti
      </label>

      <div className="overflow-x-auto rounded-md border">
        <Table className="w-max max-w-full table-fixed">
          <TableColGroup columns={SELL_HIERARCHY_SUMMARY_COLUMNS} />
          <TableHeader>
            <TableRow>
              {SELL_HIERARCHY_SUMMARY_COLUMNS.map((column) => (
                <TableHead
                  key={column.id}
                  className={getTableHeadClasses(
                    column.role,
                    column.headerClassName,
                  )}
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
                <TableCell
                  colSpan={SELL_HIERARCHY_SUMMARY_COLUMNS.length}
                  className="h-24 text-center"
                >
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
