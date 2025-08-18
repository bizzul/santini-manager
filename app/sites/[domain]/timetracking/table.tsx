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
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import { Select, SelectItem } from "@tremor/react";
import { DebouncedInput } from "@/components/debouncedInput";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    enableGlobalFilter: true,
    enableColumnFilters: true,
    enableFilters: true,
  });

  useEffect(() => {
    if (table.getState().columnFilters[0]?.id === "fullName") {
      if (table.getState().sorting[0]?.id !== "fullName") {
        table.setSorting([{ id: "fullName", desc: false }]);
      }
    }
  }, [table.getState().columnFilters[0]?.id]);

  const uniqueUsers = Array.from(
    new Set(
      //@ts-ignore
      data.map((item) => `${item.user.family_name} ${item.user.given_name}`)
    )
  );

  return (
    <div role="region" aria-label="Data table with filters">
      <div className="flex items-center py-4 gap-4">
        <DebouncedInput
          value={globalFilter ?? ""}
          onChange={(value) => setGlobalFilter(String(value))}
          className="max-w-sm"
          aria-label="Ricerca globale"
        />

        <Select
          //@ts-ignore
          value={table.getColumn("fullName")?.getFilterValue() ?? ""}
          onChange={(event) =>
            table.getColumn("fullName")?.setFilterValue(event)
          }
          className="max-w-sm"
          aria-label="Filtro utente"
        >
          <SelectItem value="" aria-label="Mostra tutti gli utenti">
            Tutti
          </SelectItem>
          {uniqueUsers.map((userName) => (
            <SelectItem
              key={userName}
              value={userName}
              aria-label={`Filtra per ${userName}`}
            >
              {userName}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className="rounded-md border" role="table" aria-label="Dati tabella">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} role="columnheader">
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
                  role="row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} role="cell">
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
                  role="cell"
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
    </div>
  );
}
