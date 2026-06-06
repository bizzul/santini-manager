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
import type { CategoryTableRow } from "@/types/category-cards";
import type { InventoryCategory } from "@/types/supabase";
import { BrowseCategoryFilter } from "@/components/categories/browse-category-filter";
import { useCategoryIdFilter } from "@/hooks/use-category-id-filter";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  domain: string;
  browseMode?: boolean;
  filterCategories?: InventoryCategory[];
  onRowClick?: (row: CategoryTableRow) => void;
}

export function DataTable<TData extends CategoryTableRow, TValue>({
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
    () => filterCategories.map((category) => category.id),
    [filterCategories],
  );

  const {
    selectedIds,
    allSelected,
    isSomeSelected,
    toggle,
    toggleAll,
    filterById,
  } = useCategoryIdFilter(categoryIds);

  const filteredData = useMemo(() => {
    if (!browseMode || filterCategories.length === 0) return data;
    return filterById(data);
  }, [browseMode, filterCategories.length, data, filterById]);

  const browseFilterItems = useMemo(
    () =>
      filterCategories.map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code,
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
        code?: string | null;
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
            ? "mb-3 rounded-lg border bg-card p-3 shadow-sm"
            : "",
        )}
      >
        {browseMode && filterCategories.length > 0 && (
          <BrowseCategoryFilter
            variant="compact"
            categories={browseFilterItems}
            allSelected={allSelected}
            selectedIds={selectedIds}
            isSomeSelected={isSomeSelected}
            onToggleAll={toggleAll}
            onToggle={toggle}
          />
        )}
        <div className={cn("flex items-center", browseMode ? "" : "py-4")}>
          <DebouncedInput
            value={globalFilter ?? ""}
            onChange={(value) => setGlobalFilter(String(value))}
            className="max-w-sm"
            placeholder="Cerca per codice, nome, descrizione..."
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
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
                  onClick={() => onRowClick?.(row.original)}
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
