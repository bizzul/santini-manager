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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DebouncedInput } from "@/components/debouncedInput";
import { DataTableRowActions } from "./data-table-row-actions";
import { Briefcase, Loader2, Plus, Trash2, Wrench } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { createItem } from "./actions/create-item.action";
import { SearchSelect } from "@/components/ui/search-select";
import { getProjectLabel } from "@/lib/project-label";
import { formatLocalDate } from "@/lib/utils";

interface InternalActivity {
  code: string;
  label: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  users?: any[];
  roles?: any[];
  tasks?: any[];
  domain?: string;
  internalActivities?: InternalActivity[];
  mode?: "personal" | "admin";
  readOnly?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  users = [],
  roles = [],
  tasks = [],
  domain,
  internalActivities = [],
  mode = "admin",
  readOnly = false,
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
    enableRowSelection: !readOnly,
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
      data.map((item) => {
        const user = (item as { user?: { family_name?: string; given_name?: string } }).user;
        return user
          ? `${user.family_name ?? ""} ${user.given_name ?? ""}`.trim() || "Unknown User"
          : "Unknown User";
      })
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
        {!readOnly && selectedCount > 0 && (
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
            {!readOnly && mode === "admin" && (
              <QuickCreateTimetrackingRow
                colSpan={columns.length}
                users={users}
                tasks={tasks}
                domain={domain}
              internalActivities={internalActivities}
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
  internalActivities,
}: {
  colSpan: number;
  users: any[];
  tasks: any[];
  domain?: string;
  internalActivities: InternalActivity[];
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
    activityType: "project" as "project" | "internal",
    taskId: "",
    internalActivity: "",
    hours: "",
    minutes: "",
    date: formatLocalDate(new Date()),
    lunchOffsite: false,
    lunchLocation: "",
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

    if (!form.userId || !form.date) {
      toast({
        variant: "destructive",
        description: "Seleziona collaboratore e data.",
      });
      return;
    }

    if (form.activityType === "project" && !form.taskId) {
      toast({
        variant: "destructive",
        description: "Seleziona un progetto.",
      });
      return;
    }

    if (form.activityType === "internal" && !form.internalActivity) {
      toast({
        variant: "destructive",
        description: "Seleziona un'attività interna.",
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

    if (form.activityType === "project" && !form.roleId) {
      toast({
        variant: "destructive",
        description: "Seleziona un reparto per il collaboratore.",
      });
      return;
    }

    if (form.lunchOffsite && !form.lunchLocation.trim()) {
      toast({
        variant: "destructive",
        description: "Inserisci il luogo del pranzo.",
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
          task: form.activityType === "project" ? form.taskId : "",
          userId: form.userId,
          roles: form.activityType === "project" ? form.roleId : "",
          activityType: form.activityType,
          internalActivity:
            form.activityType === "internal" ? form.internalActivity : undefined,
          lunchOffsite: form.lunchOffsite,
          lunchLocation: form.lunchOffsite ? form.lunchLocation.trim() : "",
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
        internalActivity: "",
        hours: "",
        minutes: "",
        date: formatLocalDate(new Date()),
        lunchOffsite: false,
        lunchLocation: "",
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

          <div className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
              <div className="rounded-md border border-border/60 bg-background/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tipo attivita
                </p>
                <RadioGroup
                  value={form.activityType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      activityType: value as "project" | "internal",
                      taskId: value === "project" ? current.taskId : "",
                      internalActivity:
                        value === "internal" ? current.internalActivity : "",
                    }))
                  }
                  className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="project" id="quick-project" />
                    <Label
                      htmlFor="quick-project"
                      className="flex cursor-pointer items-center gap-1"
                    >
                      <Briefcase className="h-4 w-4" />
                      Progetto
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="internal" id="quick-internal" />
                    <Label
                      htmlFor="quick-internal"
                      className="flex cursor-pointer items-center gap-1"
                    >
                      <Wrench className="h-4 w-4" />
                      Attivita interna
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="rounded-md border border-border/60 bg-background/50 p-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="quick-lunch-offsite"
                    checked={form.lunchOffsite}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        lunchOffsite: Boolean(checked),
                        lunchLocation: checked ? current.lunchLocation : "",
                      }))
                    }
                    disabled={isSubmitting}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="quick-lunch-offsite" className="cursor-pointer">
                      Pranzo fuori sede
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Attiva il campo luogo pranzo nel modulo sotto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select
                value={form.userId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, userId: value }))
                }
                disabled={isSubmitting}
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

              {form.activityType === "project" ? (
                <Select
                  value={form.roleId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, roleId: value }))
                  }
                  disabled={isSubmitting || !form.userId || loadingUserRoles}
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
              ) : (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                  Reparto non richiesto
                </div>
              )}

              <div className="md:col-span-2 xl:col-span-2">
                {form.activityType === "project" ? (
                  <SearchSelect
                    value={form.taskId}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, taskId: String(value) }))
                    }
                    options={taskOptions}
                    placeholder="Seleziona progetto..."
                    disabled={isSubmitting}
                  />
                ) : (
                  <Select
                    value={form.internalActivity}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, internalActivity: value }))
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona attivita interna" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalActivities.map((activity) => (
                        <SelectItem key={activity.code} value={activity.code}>
                          {activity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {form.lunchOffsite && (
                <Input
                  value={form.lunchLocation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lunchLocation: event.target.value,
                    }))
                  }
                  placeholder="Luogo pranzo"
                  disabled={isSubmitting}
                  className="md:col-span-2 xl:col-span-2"
                />
              )}

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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />

              <Input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                disabled={isSubmitting}
              />

              <Button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="w-full md:col-span-2 xl:col-span-1"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Salva report
              </Button>
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
