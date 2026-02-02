"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
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
import { cn } from "@/lib/utils";
import { SellProductCategory } from "@/types/supabase";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  categories?: SellProductCategory[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  categories = [],
}: DataTableProps<TData, TValue>) {
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Global filter state
  const [globalFilter, setGlobalFilter] = useState("");
  // Column sizing state
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  // Category filter state - now supports multiple selections
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);

  // Filter data by selected categories and global filter
  const filteredData = useMemo(() => {
    let filtered = data;

    // Category filter
    if (!allCategoriesSelected) {
      if (selectedCategories.length === 0) {
        return [];
      }
      filtered = filtered.filter((row: any) => {
        const categoryId = row.SellProduct?.category_id;
        return categoryId && selectedCategories.includes(categoryId);
      });
    }

    // Global filter (searches in: codice, cliente, nome oggetto, CAP)
    if (globalFilter.trim()) {
      const search = globalFilter.toLowerCase().trim();
      filtered = filtered.filter((row: any) => {
        // Codice
        const uniqueCode = row.unique_code?.toLowerCase() || "";

        // Cliente
        const businessName = row.Client?.businessName?.toLowerCase() || "";
        const firstName = row.Client?.individualFirstName?.toLowerCase() || "";
        const lastName = row.Client?.individualLastName?.toLowerCase() || "";
        const fullName = `${firstName} ${lastName}`.trim();

        // Nome oggetto
        const title = row.title?.toLowerCase() || "";
        const name = row.name?.toLowerCase() || "";

        // CAP
        const zipCode = row.Client?.zipCode?.toString() || "";
        const luogo = row.luogo || "";
        const capFromLuogo = luogo.match(/\b\d{4,5}\b/)?.[0] || "";

        return (
          uniqueCode.includes(search) ||
          businessName.includes(search) ||
          fullName.includes(search) ||
          firstName.includes(search) ||
          lastName.includes(search) ||
          title.includes(search) ||
          name.includes(search) ||
          zipCode.includes(search) ||
          capFromLuogo.includes(search)
        );
      });
    }

    return filtered;
  }, [data, selectedCategories, allCategoriesSelected, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    state: {
      sorting,
      columnSizing,
    },
  });

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

  return (
    <>
      {/* Filter and Search Bar - Contained in rounded border */}
      <div className="rounded-lg border bg-card p-4 mb-4 shadow-sm">
        {/* Category Filter Row */}
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
                <div key={category.id} className="flex items-center space-x-2">
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

        {/* Search Row with Clear Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              value={globalFilter ?? ""}
              onChange={(value) => setGlobalFilter(String(value))}
              className="pl-9"
              placeholder="Cerca per codice, cliente, oggetto, CAP..."
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
      </div>

      {/* Table Container - Contained in rounded border */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
                        className="px-2 py-2 overflow-hidden"
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
        {/* Pagination controls */}
        <DataTablePagination table={table} />
      </div>
    </>
  );
}
