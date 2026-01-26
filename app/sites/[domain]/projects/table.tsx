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
import { useState, useMemo } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import { DebouncedInput } from "@/components/debouncedInput";
import { cn } from "@/lib/utils";
import { SellProductCategory } from "@/types/supabase";
import { Search } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  categories?: SellProductCategory[];
}

// Update the getNestedValue function to handle missing properties more safely
const getNestedValue = (obj: any, path: string) => {
  try {
    return path.split(".").reduce((acc, part) => {
      // Return empty string if acc is null/undefined or property doesn't exist
      if (!acc || !(part in acc)) return "";
      return acc[part];
    }, obj);
  } catch (error) {
    // Return empty string in case of any errors
    return "";
  }
};

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
  // Column sizing state
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  // Category filter state - now supports multiple selections
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);

  // Filter data by selected categories
  const filteredData = useMemo(() => {
    // If "Tutte le categorie" is selected (allCategoriesSelected), show all data
    if (allCategoriesSelected) {
      return data;
    }
    // Otherwise filter by selected categories
    if (selectedCategories.length === 0) {
      return [];
    }
    return data.filter((row: any) => {
      const categoryId = row.SellProduct?.category_id;
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
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnSizing,
    },
    enableGlobalFilter: true,
    globalFilterFn: (row, columnId, filterValue) => {
      const value = getNestedValue(row.original, columnId);
      return value
        ?.toString()
        .toLowerCase()
        .includes(filterValue.toLowerCase());
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

  const isSomeSelected = selectedCategories.length > 0 && !allCategoriesSelected;

  return (
    <>
      {/* Filter and Search Bar - Contained in rounded border */}
      <div className="rounded-lg border bg-card p-4 mb-4 shadow-sm">
        {/* Category Filter Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm font-medium">Filtra per:</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="all-categories"
                checked={isSomeSelected ? "indeterminate" : allCategoriesSelected}
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
        
        {/* Search Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              value={globalFilter ?? ""}
              onChange={(value) => setGlobalFilter(String(value))}
              className="pl-9"
              placeholder="Cerca progetto..."
            />
          </div>
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
                              header.column.getIsResizing() && "bg-primary opacity-100"
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
