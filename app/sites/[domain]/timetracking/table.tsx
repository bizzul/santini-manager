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
import { useEffect, useState } from "react";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { createItem } from "./actions/create-item.action";
import { SearchSelect } from "@/components/ui/search-select";
import { getProjectLabel } from "@/lib/project-label";
import { formatLocalDate } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  users?: any[];
  roles?: any[];
  tasks?: any[];
  domain?: string;
  mode?: "personal" | "admin";
}

export function DataTable<TData, TValue>({
  columns,
  data,
  users = [],
  roles = [],
  tasks = [],
  domain,
  mode = "admin",
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
            {mode === "admin" && (
              <QuickCreateTimetrackingRow
                colSpan={columns.length}
                users={users}
                tasks={tasks}
                domain={domain}
              />
            )}
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

function QuickCreateTimetrackingRow({
  colSpan,
  users,
  tasks,
  domain,
}: {
  colSpan: number;
  users: any[];
  tasks: any[];
  domain?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [userAssignedRoles, setUserAssignedRoles] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [form, setForm] = useState({
    userId: "",
    roleId: "",
    taskId: "",
    hours: "",
    minutes: "",
    date: formatLocalDate(new Date()),
  });

  const taskOptions = tasks.map((task: any) => ({
    value: task.id?.toString() || "",
    label: getProjectLabel(task),
  }));

  useEffect(() => {
    const fetchAssignedRoles = async () => {
      if (!form.userId) {
        setUserAssignedRoles([]);
        setForm((current) => ({ ...current, roleId: "" }));
        return;
      }

      setLoadingUserRoles(true);
      try {
        const response = await fetch(`/api/users/${form.userId}/assigned-roles`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const assignedRoles =
          data.assignedRoles?.map((role: any) => ({
            id: String(role.roleId),
            name: role.roleName,
          })) || [];

        setUserAssignedRoles(assignedRoles);
        setForm((current) => ({
          ...current,
          roleId:
            assignedRoles.length === 1
              ? assignedRoles[0].id
              : assignedRoles.some((role: { id: string }) => role.id === current.roleId)
              ? current.roleId
              : "",
        }));
      } catch (error: any) {
        setUserAssignedRoles([]);
        setForm((current) => ({ ...current, roleId: "" }));
        toast({
          variant: "destructive",
          description: error?.message || "Errore nel caricamento dei reparti",
        });
      } finally {
        setLoadingUserRoles(false);
      }
    };

    fetchAssignedRoles();
  }, [form.userId]);

  const handleCreate = async () => {
    const hours = parseInt(form.hours.replace(/\D/g, "") || "0", 10);
    const minutes = parseInt(form.minutes.replace(/\D/g, "") || "0", 10);

    if (!form.userId || !form.taskId || !form.date) {
      toast({
        variant: "destructive",
        description: "Seleziona collaboratore, progetto e data.",
      });
      return;
    }

    if (hours === 0 && minutes === 0) {
      toast({
        variant: "destructive",
        description: "Inserisci almeno un'ora o dei minuti.",
      });
      return;
    }

    if (!form.roleId) {
      toast({
        variant: "destructive",
        description: "Seleziona un reparto per il collaboratore.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createItem(
        {
          date: form.date,
          description: "",
          hours,
          minutes,
          task: form.taskId,
          userId: form.userId,
          roles: form.roleId,
          activityType: "project",
          internalActivity: undefined,
          lunchOffsite: false,
          lunchLocation: "",
        },
        domain
      );

      if (result && "error" in result) {
        throw new Error(result.error || result.message);
      }

      toast({
        description: "Report ore creato correttamente.",
      });

      setForm((current) => ({
        ...current,
        taskId: "",
        hours: "",
        minutes: "",
        date: formatLocalDate(new Date()),
      }));
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error?.message || "Errore durante la creazione del report ore.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TableRow className="bg-muted/15">
      <TableCell colSpan={colSpan} className="p-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Nuovo report ore</p>
              <p className="text-xs text-muted-foreground">
                Inserimento rapido per amministratori direttamente dalla tabella.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.2fr)_220px_minmax(0,1.5fr)_120px_120px_150px_130px]">
            <Select
              value={form.userId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, userId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Collaboratore" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {(user.given_name || "") + " " + (user.family_name || "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.roleId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, roleId: value }))
              }
              disabled={!form.userId || loadingUserRoles}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !form.userId
                      ? "Reparto"
                      : loadingUserRoles
                      ? "Caricamento reparti..."
                      : "Seleziona reparto"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {userAssignedRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SearchSelect
              value={form.taskId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, taskId: String(value) }))
              }
              options={taskOptions}
              placeholder="Seleziona progetto..."
            />

            <Input
              value={form.hours}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  hours: event.target.value.replace(/\D/g, ""),
                }))
              }
              inputMode="numeric"
              placeholder="Ore"
            />

            <Input
              value={form.minutes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  minutes: event.target.value.replace(/\D/g, ""),
                }))
              }
              inputMode="numeric"
              placeholder="Minuti"
            />

            <Input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
            />

            <Button onClick={handleCreate} disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Salva report
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
