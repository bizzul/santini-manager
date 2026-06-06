"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
  RowSelectionState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useCallback, useEffect } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import { DebouncedInput } from "@/components/debouncedInput";
import { Trash2, Loader2, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { removeItem } from "./actions/delete-item.action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TableColGroup } from "@/components/table/table-colgroup";
import {
  getInventoryArticlesCellClassName,
  getInventoryArticlesHeadClassName,
  getVisiblePresetColumns,
  type TableLayoutPreset,
} from "@/lib/table-layout-presets";
import { InventoryCategory } from "@/types/supabase";

type InventoryTableViewMode = "compact" | "extended";
type EmbeddedColumnPreset = "categoryDrilldown";

const CATEGORY_DRILLDOWN_COLUMN_IDS = new Set([
  "internal_code",
  "subcategory",
  "name",
  "color",
  "supplier",
  "width",
  "height",
  "length",
  "thickness",
  "diameter",
  "quantity",
  "purchase_unit_price",
  "total_price",
  "actions",
]);

const COMPACT_COLUMN_IDS = new Set([
  "subcategory",
  "name",
  "color",
  "supplier",
  "width",
  "height",
  "length",
  "thickness",
  "diameter",
  "quantity",
  "purchase_unit_price",
  "total_price",
]);

function getColumnId(column: ColumnDef<any, any>): string | undefined {
  return (
    column.id ||
    ("accessorKey" in column && typeof column.accessorKey === "string"
      ? column.accessorKey
      : undefined)
  );
}

function getEmbeddedColumnVisibility(
  columns: ColumnDef<any, any>[],
  preset: EmbeddedColumnPreset,
): Record<string, boolean> {
  const allowedIds =
    preset === "categoryDrilldown" ? CATEGORY_DRILLDOWN_COLUMN_IDS : new Set();

  return Object.fromEntries(
    columns
      .map((column) => {
        const columnId = getColumnId(column);
        return columnId ? [columnId, allowedIds.has(columnId)] : null;
      })
      .filter(Boolean) as Array<[string, boolean]>,
  );
}

function getColumnVisibility(
  columns: ColumnDef<any, any>[],
  mode: InventoryTableViewMode,
): Record<string, boolean> {
  if (mode === "extended") {
    return {};
  }

  return Object.fromEntries(
    columns
      .map((column) => {
        const columnId = getColumnId(column);
        return columnId ? [columnId, COMPACT_COLUMN_IDS.has(columnId)] : null;
      })
      .filter(Boolean) as Array<[string, boolean]>,
  );
}

function getDenseLayoutOptions(
  mode: InventoryTableViewMode,
  embeddedColumnPreset?: EmbeddedColumnPreset,
) {
  const isDrilldown = embeddedColumnPreset === "categoryDrilldown";
  return {
    isDrilldown,
    includeSubcategory: mode === "compact" && !isDrilldown,
  };
}

function usesDenseTableLayout(
  mode: InventoryTableViewMode,
  embeddedColumnPreset?: EmbeddedColumnPreset,
) {
  return mode === "compact" || embeddedColumnPreset === "categoryDrilldown";
}

function getColumnCellClassName(
  columnId: string,
  mode: InventoryTableViewMode,
  embeddedColumnPreset?: EmbeddedColumnPreset,
) {
  if (usesDenseTableLayout(mode, embeddedColumnPreset)) {
    return getInventoryArticlesCellClassName(
      columnId,
      getDenseLayoutOptions(mode, embeddedColumnPreset),
    );
  }

  return "h-9 px-2 py-1.5 text-center align-middle [&>div]:justify-center [&_button]:h-7 [&_button]:px-2 [&_span]:text-center";
}

function getColumnHeadClassName(
  columnId: string,
  mode: InventoryTableViewMode,
  embeddedColumnPreset?: EmbeddedColumnPreset,
) {
  if (usesDenseTableLayout(mode, embeddedColumnPreset)) {
    return getInventoryArticlesHeadClassName(
      columnId,
      getDenseLayoutOptions(mode, embeddedColumnPreset),
    );
  }

  return "h-9 px-2 py-1.5 text-center align-middle";
}

function getInventoryPresetName(
  mode: InventoryTableViewMode,
  embeddedColumnPreset?: EmbeddedColumnPreset,
): TableLayoutPreset {
  const isDrilldown = embeddedColumnPreset === "categoryDrilldown";
  if (isDrilldown) return "inventoryArticlesDrilldown";
  return mode === "compact" ? "inventoryArticlesCompact" : "inventoryArticlesDense";
}

function getCategoryFilterLabel(category: InventoryCategory) {
  const label = category.code || category.name?.slice(0, 3) || "";
  return label.slice(0, 3).toUpperCase();
}

function normalizeFilterValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  categories?: InventoryCategory[];
  embeddedMode?: boolean;
  embeddedColumnPreset?: EmbeddedColumnPreset;
  onBack?: () => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  categories = [],
  embeddedMode = false,
  embeddedColumnPreset,
  onBack,
}: DataTableProps<TData, TValue>) {
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<Record<string, boolean>>(() =>
      embeddedColumnPreset
        ? getEmbeddedColumnVisibility(columns, embeddedColumnPreset)
        : getColumnVisibility(columns, "compact"),
    );
  const [globalFilter, setGlobalFilter] = useState("");
  const [viewMode, setViewMode] =
    useState<InventoryTableViewMode>("compact");
  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Category filter state - supports multiple selections
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (embeddedColumnPreset) {
      setColumnVisibility(
        getEmbeddedColumnVisibility(columns, embeddedColumnPreset),
      );
      return;
    }
    setColumnVisibility(getColumnVisibility(columns, viewMode));
  }, [columns, viewMode, embeddedColumnPreset]);

  // Filter data by selected categories
  const filteredData = useMemo(() => {
    if (allCategoriesSelected) {
      return data;
    }
    if (selectedCategories.length === 0) {
      return [];
    }

    const selectedCategoryRecords = categories.filter((category) =>
      selectedCategories.includes(category.id),
    );
    const selectedCategoryIds = new Set(selectedCategories);
    const selectedCategoryCodes = new Set(
      selectedCategoryRecords
        .map((category) => normalizeFilterValue(category.code))
        .filter(Boolean),
    );
    const selectedCategoryNames = new Set(
      selectedCategoryRecords
        .map((category) => normalizeFilterValue(category.name))
        .filter(Boolean),
    );

    return data.filter((row: any) => {
      const attrs = row.attributes || {};
      const rowCategoryId = row.category?.id || row.category_id;
      const rowCategoryCode = normalizeFilterValue(
        row.category?.code || row.category_code || attrs.category_code,
      );
      const rowCategoryName = normalizeFilterValue(
        row.category?.name || row.category || attrs.category,
      );

      return (
        (rowCategoryId && selectedCategoryIds.has(rowCategoryId)) ||
        (rowCategoryCode && selectedCategoryCodes.has(rowCategoryCode)) ||
        (rowCategoryName && selectedCategoryNames.has(rowCategoryName))
      );
    });
  }, [data, categories, selectedCategories, allCategoriesSelected]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    enableGlobalFilter: true,
    enableRowSelection: true,
  });

  const denseLayout = usesDenseTableLayout(viewMode, embeddedColumnPreset);
  const visibleDenseColumns = useMemo(
    () =>
      getVisiblePresetColumns(
        table
          .getVisibleLeafColumns()
          .map((column) => column.id)
          .filter(Boolean),
        getInventoryPresetName(viewMode, embeddedColumnPreset),
      ),
    [table, viewMode, embeddedColumnPreset, columnVisibility],
  );

  const handleCategoryToggle = (categoryId: string) => {
    setAllCategoriesSelected(false);
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        const newSelection = prev.filter((id) => id !== categoryId);
        // If no categories selected, select all
        if (newSelection.length === 0) {
          setAllCategoriesSelected(true);
          return [];
        }
        return newSelection;
      }
      return [...prev, categoryId];
    });
  };

  const handleSelectAllCategories = (checked: boolean) => {
    setAllCategoriesSelected(checked);
    if (checked) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map((cat) => cat.id));
    }
  };

  const isSomeSelected =
    selectedCategories.length > 0 && !allCategoriesSelected;

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setGlobalFilter("");
    setAllCategoriesSelected(true);
    setSelectedCategories([]);
  }, []);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of selectedRows) {
      const item = row.original as any;
      const result = await removeItem(item.item_id || item.id);
      if (result.error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setRowSelection({});

    if (successCount > 0) {
      toast({
        description: `${successCount} elemento/i eliminato/i con successo!`,
      });
      router.refresh();
    }

    if (errorCount > 0) {
      toast({
        variant: "destructive",
        description: `${errorCount} elemento/i non eliminato/i a causa di errori.`,
      });
    }
  };

  return (
    <>
      {/* Filter and Search Bar - Contained in rounded border */}
      <div className="rounded-lg border bg-card p-3 mb-3 shadow-sm">
        {/* Category Filter Row */}
        {!embeddedMode && categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="text-sm font-medium">Categoria:</span>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-categories"
                  checked={
                    isSomeSelected ? "indeterminate" : allCategoriesSelected
                  }
                  onCheckedChange={handleSelectAllCategories}
                />
                <Label
                  htmlFor="all-categories"
                  className="text-sm font-normal cursor-pointer"
                >
                  Tutte le categorie
                </Label>
              </div>
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <div
                    key={category.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="text-sm font-normal cursor-pointer flex items-center gap-2"
                      title={category.name}
                    >
                      {getCategoryFilterLabel(category)}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Row with Clear Button and Bulk Delete */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              value={globalFilter ?? ""}
              onChange={(value) => setGlobalFilter(String(value))}
              className="pl-9"
              placeholder="Cerca per codice, nome, fornitore..."
            />
          </div>
          {(globalFilter || !allCategoriesSelected) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 gap-1"
            >
              <X className="h-4 w-4" />
              Cancella filtri
            </Button>
          )}
          {!embeddedMode && (
            <div className="ml-auto flex items-center rounded-md border bg-background p-0.5">
              <Button
                type="button"
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode("compact")}
              >
                Compatta
              </Button>
              <Button
                type="button"
                variant={viewMode === "extended" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode("extended")}
              >
                Estesa
              </Button>
            </div>
          )}
          {!embeddedMode && selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Elimina ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Table Container - Contained in rounded border */}
      <div className="w-full min-w-0 rounded-lg border bg-card shadow-sm overflow-y-visible">
        <div
          className={
            denseLayout
              ? "w-full overflow-x-auto"
              : "w-full overflow-x-auto"
          }
        >
          <Table
            className={
              denseLayout
                ? "w-max max-w-full table-fixed text-xs"
                : "w-full text-xs"
            }
          >
            {denseLayout && visibleDenseColumns.length > 0 ? (
              <TableColGroup columns={visibleDenseColumns} />
            ) : null}
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className={getColumnHeadClassName(
                          header.column.id,
                          viewMode,
                          embeddedColumnPreset,
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={getColumnCellClassName(
                          cell.column.id,
                          viewMode,
                          embeddedColumnPreset,
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
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
      <div className="pt-4">
        <DataTablePagination table={table} trailingAction={onBack} />
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {selectedCount} elemento/i. Questa azione non
              può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
