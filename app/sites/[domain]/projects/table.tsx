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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useCallback } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import { DebouncedInput } from "@/components/debouncedInput";
import { cn } from "@/lib/utils";
import { SellProductCategory } from "@/types/supabase";
import { Search, X, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkUnarchive } from "./actions/bulk-unarchive.action";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries as ISO2_COUNTRIES } from "@/components/clients/countries";

const ALL_COUNTRIES = "__all__";

const COUNTRY_LABEL = new Map(
  ISO2_COUNTRIES.map((c) => [c.code.toUpperCase(), c.label]),
);

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  categories?: SellProductCategory[];
  domain?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  categories = [],
  domain,
}: DataTableProps<TData, TValue>) {
  const { toast } = useToast();
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Global filter state
  const [globalFilter, setGlobalFilter] = useState("");
  // Column sizing state
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  // Category filter state - now supports multiple selections
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);
  // Country filter state ("" = all countries)
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  // Row selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Archived filter state
  const [archivedFilter, setArchivedFilter] = useState<"all" | "archived" | "not_archived">("not_archived");
  // Loading state for bulk actions
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Distinct countries present in the data (for the country filter dropdown).
  const availableCountries = useMemo(() => {
    const set = new Set<string>();
    (data as any[]).forEach((row) => {
      const cc = row?.Client?.countryCode
        ? String(row.Client.countryCode).toUpperCase()
        : "";
      if (cc) set.add(cc);
    });
    return Array.from(set).sort((a, b) =>
      (COUNTRY_LABEL.get(a) || a).localeCompare(COUNTRY_LABEL.get(b) || b),
    );
  }, [data]);

  // Filter data by selected categories, country, archived status, and global filter
  const filteredData = useMemo(() => {
    let filtered = data;

    // Archived filter
    if (archivedFilter === "archived") {
      filtered = filtered.filter((row: any) => row.archived === true);
    } else if (archivedFilter === "not_archived") {
      filtered = filtered.filter((row: any) => row.archived !== true);
    }

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

    // Country filter
    if (selectedCountry) {
      filtered = filtered.filter(
        (row: any) =>
          String(row.Client?.countryCode || "").toUpperCase() ===
          selectedCountry,
      );
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
  }, [data, selectedCategories, allCategoriesSelected, selectedCountry, globalFilter, archivedFilter]);

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
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnSizing,
      rowSelection,
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
    setSelectedCountry("");
    setArchivedFilter("not_archived");
  }, []);

  // Handle bulk unarchive
  const handleBulkUnarchive = useCallback(async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const ids = selectedRows.map((row: any) => row.original.id);
    setBulkActionLoading(true);

    try {
      const result = await bulkUnarchive(ids);
      if (result.success) {
        toast({
          description: `${result.count} elementi disarchiviati con successo!`,
        });
        setRowSelection({});
      } else {
        toast({
          variant: "destructive",
          description: result.message || "Errore durante la disarchiviazione",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore durante la disarchiviazione",
      });
    } finally {
      setBulkActionLoading(false);
    }
  }, [table, toast]);

  // Count selected rows
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  // Check if any filters are active
  const hasActiveFilters =
    globalFilter ||
    !allCategoriesSelected ||
    !!selectedCountry ||
    archivedFilter !== "not_archived";

  return (
    <>
      {/* Bulk Action Bar - shows when items are selected */}
      {selectedCount > 0 && (
        <div className="rounded-lg border bg-primary/10 border-primary/20 p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedCount} elemento/i selezionato/i
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkUnarchive}
              disabled={bulkActionLoading}
              className="gap-1"
            >
              <ArchiveRestore className="h-4 w-4" />
              {bulkActionLoading ? "Disarchiviando..." : "Disarchivia selezionati"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Deseleziona
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar - Contained in rounded border */}
      <div className="rounded-lg border bg-card p-4 mb-4 shadow-sm">
        {/* Archived Filter Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm font-medium">Stato:</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-not-archived"
                checked={archivedFilter === "not_archived"}
                onCheckedChange={(checked) => {
                  if (checked) setArchivedFilter("not_archived");
                }}
              />
              <Label
                htmlFor="filter-not-archived"
                className="text-sm font-normal cursor-pointer"
              >
                Non archiviate
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-archived"
                checked={archivedFilter === "archived"}
                onCheckedChange={(checked) => {
                  if (checked) setArchivedFilter("archived");
                }}
              />
              <Label
                htmlFor="filter-archived"
                className="text-sm font-normal cursor-pointer flex items-center gap-1"
              >
                <Archive className="h-3 w-3" />
                Solo archiviate
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-all"
                checked={archivedFilter === "all"}
                onCheckedChange={(checked) => {
                  if (checked) setArchivedFilter("all");
                }}
              />
              <Label
                htmlFor="filter-all"
                className="text-sm font-normal cursor-pointer"
              >
                Tutte
              </Label>
            </div>
          </div>
        </div>

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

        {/* Country Filter Row */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-sm font-medium">Paese:</span>
          <Select
            value={selectedCountry || ALL_COUNTRIES}
            onValueChange={(value) =>
              setSelectedCountry(value === ALL_COUNTRIES ? "" : value)
            }
          >
            <SelectTrigger className="h-9 w-[220px]" aria-label="Filtra per paese">
              <SelectValue placeholder="Tutti i paesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COUNTRIES}>Tutti i paesi</SelectItem>
              {availableCountries.map((cc) => (
                <SelectItem key={cc} value={cc}>
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`}
                      alt={cc}
                      className="h-4 w-6 shrink-0 rounded-sm border border-border/60 object-cover"
                    />
                    {COUNTRY_LABEL.get(cc) || cc}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {hasActiveFilters && (
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
      <div className="rounded-lg border bg-card shadow-sm overflow-y-visible">
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
                    className="hover:bg-muted/50"
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
