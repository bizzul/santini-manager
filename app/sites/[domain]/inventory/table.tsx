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
import { useState, useMemo, useCallback } from "react";
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
import { InventoryCategory } from "@/types/supabase";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  categories?: InventoryCategory[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  categories = [],
}: DataTableProps<TData, TValue>) {
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
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

  // Filter data by selected categories
  const filteredData = useMemo(() => {
    if (allCategoriesSelected) {
      return data;
    }
    if (selectedCategories.length === 0) {
      return [];
    }
    return data.filter((row: any) => {
      const categoryId = row.category?.id || row.category_id;
      return categoryId && selectedCategories.includes(categoryId);
    });
  }, [data, selectedCategories, allCategoriesSelected]);

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
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    enableGlobalFilter: true,
    enableRowSelection: true,
  });

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
                      {category.code && (
                        <span className="text-muted-foreground">
                          [{category.code}]
                        </span>
                      )}
                      {category.name}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Row with Clear Button and Bulk Delete */}
        <div className="flex items-center gap-2">
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
          {selectedCount > 0 && (
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
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
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
                      <TableCell key={cell.id}>
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
        {/* Pagination controls */}
        <DataTablePagination table={table} />
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
