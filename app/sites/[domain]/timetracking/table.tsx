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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DebouncedInput } from "@/components/debouncedInput";
import { DataTableRowActions } from "./data-table-row-actions";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  users?: any[];
  roles?: any[];
  tasks?: any[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  users = [],
  roles = [],
  tasks = [],
}: DataTableProps<TData, TValue>) {
  const { toast } = useToast();
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  // Selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = useState(false);

  // Get selected row IDs
  const getSelectedIds = (): number[] => {
    const selectedRows = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    return selectedRows
      .map((index) => {
        const row = data[parseInt(index)] as any;
        return row?.id;
      })
      .filter(Boolean);
  };

  // Delete selected entries
  const handleDeleteSelected = async () => {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return;

    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare ${selectedIds.length} registrazion${
        selectedIds.length === 1 ? "e" : "i"
      }?`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/time-tracking/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Errore durante l'eliminazione");
      }

      toast({
        description: `${selectedIds.length} registrazion${
          selectedIds.length === 1 ? "e eliminata" : "i eliminate"
        }`,
      });

      setRowSelection({});
      // Reload page to refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error deleting entries:", error);
      toast({
        description: "Errore durante l'eliminazione. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Create columns with additional data
  const columnsWithData = columns.map((column: any) => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => (
          <DataTableRowActions
            row={row}
            users={users}
            roles={roles}
            tasks={tasks}
          />
        ),
      };
    }
    return column;
  });

  const table = useReactTable({
    data,
    columns: columnsWithData,
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
    enableColumnFilters: true,
    enableFilters: true,
    enableRowSelection: true,
  });

  // useEffect(() => {
  //   if (table.getState().columnFilters[0]?.id === "fullName") {
  //     if (table.getState().sorting[0]?.id !== "fullName") {
  //       table.setSorting([{ id: "fullName", desc: false }]);
  //     }
  //   }
  // }, [table.getState().columnFilters[0]?.id]);

  const uniqueUsers = Array.from(
    new Set(
      data.map((item) =>
        //@ts-ignore
        item.user
          ? //@ts-ignore
            `${item.user.family_name} ${item.user.given_name}`
          : "Unknown User"
      )
    )
  );

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

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
          value={
            (table.getColumn("fullName")?.getFilterValue() as string) ?? "all"
          }
          onValueChange={(value) =>
            table
              .getColumn("fullName")
              ?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="max-w-sm" aria-label="Filtro utente">
            <SelectValue placeholder="Tutti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" aria-label="Mostra tutti gli utenti">
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
          </SelectContent>
        </Select>

        {/* Delete selected button */}
        {selectedCount > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="ml-auto"
          >
            {isDeleting ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Elimina ({selectedCount})
          </Button>
        )}
      </div>

      {/* Selection info */}
      {selectedCount > 0 && (
        <div className="text-sm text-muted-foreground mb-2">
          {selectedCount} di {table.getFilteredRowModel().rows.length} righe
          selezionate
        </div>
      )}
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
