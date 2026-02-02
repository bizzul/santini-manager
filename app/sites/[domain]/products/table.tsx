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
  ColumnSizingState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useCallback } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import { DebouncedInput } from "@/components/debouncedInput";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { batchDeleteProducts } from "./actions/delete-item.action";
import { useRouter } from "next/navigation";
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
import { SellProductWithAction } from "./columns";
import { SellProductCategory } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  domain?: string;
  categories?: SellProductCategory[];
}

export function DataTable<TData extends { id: number }, TValue>({
  columns,
  data,
  domain,
  categories = [],
}: DataTableProps<TData, TValue>) {
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Category filter state - now supports multiple selections
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);
  // Column sizing state
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const { toast } = useToast();
  const router = useRouter();

  // Filter data by selected categories
  const filteredData = useMemo(() => {
    if (allCategoriesSelected) {
      return data;
    }
    if (selectedCategories.length === 0) {
      return [];
    }
    return data.filter((row: any) => {
      const categoryId = row.category_id;
      return categoryId && selectedCategories.includes(categoryId);
    });
  }, [data, selectedCategories, allCategoriesSelected]);

  const handleCategoryToggle = (categoryId: number) => {
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

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnSizing,
    },
    enableGlobalFilter: true,
    enableRowSelection: true,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBatchDelete = async () => {
    if (selectedCount === 0) return;

    setIsDeleting(true);
    try {
      const ids = selectedRows.map((row) => row.original.id);
      const result = await batchDeleteProducts(ids, domain);

      if (result.success) {
        toast({
          description: `${result.deleted} prodotti eliminati con successo!`,
        });
        setRowSelection({});
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          description: result.message || "Errore durante l'eliminazione",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore durante l'eliminazione",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      {/* Filter and Search Bar - Contained in rounded border */}
      <div className="rounded-lg border bg-card p-4 mb-4 shadow-sm">
        {/* Category Filter Row */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="text-sm font-medium">Categoria:</span>
            <div className="flex flex-wrap items-center gap-4">
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
                    >
                      {category.color && (
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      {category.name}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Row with Clear Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <DebouncedInput
                value={globalFilter ?? ""}
                onChange={(value) => setGlobalFilter(String(value))}
                className="pl-9"
                placeholder="Cerca prodotti..."
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
          </div>

          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Elimina {selectedCount} selezionati
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {selectedCount} prodotti. Questa azione è
              irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
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
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm overflow-x-auto">
        <Table style={{ width: table.getCenterTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        position: "relative",
                      }}
                      className="px-2 group"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {/* Resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                            "opacity-0 group-hover:opacity-100 hover:bg-primary/50",
                            header.column.getIsResizing() &&
                              "bg-primary opacity-100"
                          )}
                        />
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
                      style={{
                        width: cell.column.getSize(),
                      }}
                      className="px-2 py-2 overflow-hidden text-ellipsis"
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
      <div className="pt-8">
        {/* Pagination controls */}
        <DataTablePagination table={table} />
      </div>
    </>
  );
}
