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
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import { DebouncedInput } from "@/components/debouncedInput";
import { getCategorySearchText } from "@/lib/category-display";
import type { SellCategoryTableRow } from "@/types/sell-product-category-cards";
import type { SellProductCategory } from "@/types/supabase";
import { BrowseCategoryFilter } from "@/components/categories/browse-category-filter";
import { useCategoryIdFilter } from "@/hooks/use-category-id-filter";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  domain: string;
  browseMode?: boolean;
  filterCategories?: SellProductCategory[];
  onRowClick?: (row: SellCategoryTableRow) => void;
}

export function DataTable<TData extends SellCategoryTableRow, TValue>({
  columns,
  data,
  browseMode = false,
  filterCategories = [],
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const categoryIds = useMemo(
    () => filterCategories.map((category) => String(category.id)),
    [filterCategories],
  );

  const {
    selectedIds,
    allSelected,
    isSomeSelected,
    toggle,
    toggleAll,
  } = useCategoryIdFilter(categoryIds);

  const filteredData = useMemo(() => {
    if (!browseMode || filterCategories.length === 0 || allSelected) return data;
    if (selectedIds.length === 0) return [];
    const allowed = new Set(selectedIds);
    return data.filter((row) => allowed.has(String(row.id)));
  }, [browseMode, filterCategories.length, data, allSelected, selectedIds]);

  const browseFilterItems = useMemo(
    () =>
      filterCategories.map((category) => ({
        id: String(category.id),
        name: category.name,
        color: category.color,
      })),
    [filterCategories],
  );

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
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue).trim().toLowerCase();
      if (!query) return true;
      const original = row.original as {
        name?: string | null;
        description?: string | null;
      };
      return getCategorySearchText(original).includes(query);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    enableGlobalFilter: true,
  });

  return (
    <>
      <div
        className={cn(
          browseMode && filterCategories.length > 0
            ? "mb-4 rounded-lg border bg-card p-4 shadow-sm"
            : "",
        )}
      >
        {browseMode && filterCategories.length > 0 && (
          <BrowseCategoryFilter
            variant="cards"
            categories={browseFilterItems}
            allSelected={allSelected}
            selectedIds={selectedIds}
            isSomeSelected={isSomeSelected}
            onToggleAll={toggleAll}
            onToggle={toggle}
          />
        )}
        <div
          className={cn(
            "flex items-center",
            browseMode && filterCategories.length > 0 && "border-t pt-4",
            !browseMode && "py-4",
          )}
        >
          <DebouncedInput
            value={globalFilter ?? ""}
            onChange={(value) => setGlobalFilter(String(value))}
            className="max-w-sm"
            placeholder="Cerca per nome o descrizione..."
          />
        </div>
      </div>
      <div className="rounded-md border">
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
                            header.getContext(),
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
                  className={cn(
                    onRowClick &&
                      "cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50",
                  )}
                  onClick={() =>
                    onRowClick?.(row.original as SellCategoryTableRow)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={
                        cell.column.id === "select"
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
        <DataTablePagination table={table} />
      </div>
    </>
  );
}
