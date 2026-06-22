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
import { useEffect, useMemo, useState } from "react";
import { DataTablePagination } from "@/components/table/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatLocalDate, cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

interface InternalActivity {
  code: string;
  label: string;
}

const DEFAULT_AVATAR_COLOR = "#6366f1";

function buildUserInitials(user: any): string {
  const stored = (user?.initials || "").toString().trim();
  if (stored) return stored.slice(0, 2).toUpperCase();

  const fromGiven = (user?.given_name || "").trim().charAt(0);
  const fromFamily = (user?.family_name || "").trim().charAt(0);
  const composed = `${fromGiven}${fromFamily}`.toUpperCase();
  if (composed) return composed;

  const fallback = (user?.email || "?").trim().charAt(0).toUpperCase();
  return fallback || "?";
}

function UserInitialBadge({ user }: { user: any }) {
  const color = (user?.color as string | undefined) || DEFAULT_AVATAR_COLOR;
  const initials = buildUserInitials(user);

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
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
  currentEmployeeId?: string;
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
  currentEmployeeId,
}: DataTableProps<TData, TValue>) {
  const { toast } = useToast();
  // Sorting State
  const [sorting, setSorting] = useState<SortingState>([]);
  // Filter state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  // Selection state
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredData = useMemo(() => {
    return (data as any[]).filter((item) => {
      const rawDate = item?.created_at;
      const date = rawDate ? new Date(rawDate) : null;

      if (yearFilter !== "all") {
        if (!date || Number.isNaN(date.getTime())) return false;
        if (date.getFullYear().toString() !== yearFilter) return false;
      }

      if (monthFilter !== "all") {
        if (!date || Number.isNaN(date.getTime())) return false;
        if ((date.getMonth() + 1).toString() !== monthFilter) return false;
      }

      if (projectFilter !== "all") {
        const taskId = item?.task?.id?.toString() ?? "";
        if (taskId !== projectFilter) return false;
      }

      return true;
    }) as TData[];
  }, [data, yearFilter, monthFilter, projectFilter]);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    (data as any[]).forEach((item) => {
      const raw = item?.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      years.add(d.getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [data]);

  const monthOptions = useMemo(
    () => [
      { value: "1", label: "Gennaio" },
      { value: "2", label: "Febbraio" },
      { value: "3", label: "Marzo" },
      { value: "4", label: "Aprile" },
      { value: "5", label: "Maggio" },
      { value: "6", label: "Giugno" },
      { value: "7", label: "Luglio" },
      { value: "8", label: "Agosto" },
      { value: "9", label: "Settembre" },
      { value: "10", label: "Ottobre" },
      { value: "11", label: "Novembre" },
      { value: "12", label: "Dicembre" },
    ],
    []
  );

  const projectFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (data as any[]).forEach((item) => {
      const task = item?.task;
      const id = task?.id?.toString();
      if (!id || seen.has(id)) return;
      const label = getProjectLabel(task) || task?.unique_code || `#${id}`;
      seen.set(id, label);
    });
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  // Get selected row IDs
  const getSelectedIds = (): number[] => {
    const selectedRows = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    );
    return selectedRows
      .map((index) => {
        const row = filteredData[parseInt(index)] as any;
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
    data: filteredData,
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

  const uniqueUserOptions = (() => {
    const seen = new Map<string, { label: string; user: any | null }>();

    data.forEach((item) => {
      const user = (item as { user?: any }).user;
      const label = user
        ? `${user.family_name ?? ""} ${user.given_name ?? ""}`.trim() ||
          "Unknown User"
        : "Unknown User";

      if (!seen.has(label)) {
        const matchedUser =
          user
            ? users.find(
                (candidate: any) =>
                  candidate.id === user.id ||
                  (candidate.family_name === user.family_name &&
                    candidate.given_name === user.given_name)
              ) || user
            : null;

        seen.set(label, { label, user: matchedUser });
      }
    });

    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  })();

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

  return (
    <TooltipProvider delayDuration={150}>
      <div role="region" aria-label="Data table with filters" className="space-y-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <DebouncedInput
              value={globalFilter ?? ""}
              onChange={(value) => setGlobalFilter(String(value))}
              placeholder="Cerca…"
              className="h-9 w-full max-w-xs"
              aria-label="Ricerca globale"
            />

            <Select
              value={
                (table.getColumn("fullName")?.getFilterValue() as string) ??
                "all"
              }
              onValueChange={(value) =>
                table
                  .getColumn("fullName")
                  ?.setFilterValue(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger className="h-9 w-[220px]" aria-label="Filtro utente">
                <SelectValue placeholder="Tutti i collaboratori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" aria-label="Mostra tutti gli utenti">
                  Tutti i collaboratori
                </SelectItem>
                {uniqueUserOptions.map(({ label, user }) => (
                  <SelectItem
                    key={label}
                    value={label}
                    aria-label={`Filtra per ${label}`}
                  >
                    <span className="flex items-center gap-2">
                      {user ? (
                        <UserInitialBadge user={user} />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: DEFAULT_AVATAR_COLOR }}
                        >
                          ?
                        </span>
                      )}
                      <span>{label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger
                className="h-9 w-[120px]"
                aria-label="Filtro anno"
              >
                <SelectValue placeholder="Anno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli anni</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger
                className="h-9 w-[140px]"
                aria-label="Filtro mese"
              >
                <SelectValue placeholder="Mese" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i mesi</SelectItem>
                {monthOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[260px]">
              <SearchSelect
                value={projectFilter}
                onValueChange={(v) => setProjectFilter(v.toString())}
                placeholder="Progetto"
                options={[
                  { value: "all", label: "Tutti i progetti" },
                  ...projectFilterOptions,
                ]}
              />
            </div>

            {(yearFilter !== "all" ||
              monthFilter !== "all" ||
              projectFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setYearFilter("all");
                  setMonthFilter("all");
                  setProjectFilter("all");
                }}
                aria-label="Reimposta filtri"
              >
                Reset filtri
              </Button>
            )}

            {!readOnly && selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="ml-auto"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Elimina ({selectedCount})
              </Button>
            )}
          </div>
        </div>

        <div
          className="rounded-lg border bg-card shadow-sm overflow-x-auto"
          role="table"
          aria-label="Dati tabella"
        >
          <Table className="table-fixed w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} role="row">
                  {headerGroup.headers.map((header) => {
                    const headMeta = header.column.columnDef.meta as
                      | { headClassName?: string }
                      | undefined;
                    return (
                      <TableHead
                        key={header.id}
                        role="columnheader"
                        className={cn(
                          "h-10 px-3 align-middle",
                          headMeta?.headClassName
                        )}
                      >
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
              {mode === "admin" && !readOnly && (
                <QuickCreateTimetrackingRow
                  colSpan={columns.length}
                  users={users}
                  tasks={tasks}
                  domain={domain}
                  internalActivities={internalActivities}
                />
              )}
              {mode === "personal" && currentEmployeeId && (
                <QuickCreateTimetrackingRow
                  colSpan={columns.length}
                  users={users}
                  tasks={tasks}
                  domain={domain}
                  internalActivities={internalActivities}
                  lockedUserId={currentEmployeeId}
                />
              )}
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    role="row"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cellMeta = cell.column.columnDef.meta as
                        | { cellClassName?: string }
                        | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          role="cell"
                          className={cn(
                            "h-10 px-3 py-1.5 align-middle",
                            cellMeta?.cellClassName
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
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
        <div className="pt-2">
          <DataTablePagination table={table} />
        </div>
      </div>
    </TooltipProvider>
  );
}

function QuickCreateTimetrackingRow({
  colSpan,
  users,
  tasks,
  domain,
  internalActivities,
  lockedUserId,
}: {
  colSpan: number;
  users: any[];
  tasks: any[];
  domain?: string;
  internalActivities: InternalActivity[];
  lockedUserId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isPersonal = Boolean(lockedUserId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [userAssignedRoles, setUserAssignedRoles] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [form, setForm] = useState({
    userId: lockedUserId || "",
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

  const setActivityType = (next: "project" | "internal") => {
    setForm((current) => ({
      ...current,
      activityType: next,
      taskId: next === "project" ? current.taskId : "",
      internalActivity: next === "internal" ? current.internalActivity : "",
    }));
  };

  const inputCls = "h-9";

  return (
    <TableRow className="bg-muted/15">
      <TableCell colSpan={colSpan} className="p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold leading-none">Nuovo report ore</p>
              <span className="text-xs text-muted-foreground">
                {isPersonal
                  ? "Inserisci le tue ore"
                  : "Inserimento rapido per amministratori"}
              </span>
            </div>

            <div
              role="tablist"
              aria-label="Tipo attivita"
              className="ml-auto inline-flex items-center rounded-md border border-border/60 bg-background/50 p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={form.activityType === "project"}
                disabled={isSubmitting}
                onClick={() => setActivityType("project")}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  form.activityType === "project"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Briefcase className="h-3.5 w-3.5" />
                Progetto
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={form.activityType === "internal"}
                disabled={isSubmitting}
                onClick={() => setActivityType("internal")}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  form.activityType === "internal"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                Attivita interna
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 py-1">
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
              <Label
                htmlFor="quick-lunch-offsite"
                className="cursor-pointer text-xs font-medium"
              >
                Pranzo fuori sede
              </Label>
            </div>
          </div>

          <div
            className={cn(
              "grid gap-2 grid-cols-1",
              isPersonal ? "sm:grid-cols-2" : "sm:grid-cols-3"
            )}
          >
            {!isPersonal && (
              <Select
                value={form.userId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, userId: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger className={inputCls} aria-label="Collaboratore">
                  <SelectValue placeholder="Collaboratore" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      <span className="flex items-center gap-2">
                        <UserInitialBadge user={user} />
                        <span>
                          {(user.given_name || "") + " " + (user.family_name || "")}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {form.activityType === "project" ? (
              <Select
                value={form.roleId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, roleId: value }))
                }
                disabled={isSubmitting || !form.userId || loadingUserRoles}
              >
                <SelectTrigger className={inputCls} aria-label="Reparto">
                  <SelectValue
                    placeholder={
                      !form.userId
                        ? "Reparto"
                        : loadingUserRoles
                        ? "Caricamento…"
                        : "Reparto"
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
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-xs text-muted-foreground">
                Reparto non richiesto
              </div>
            )}

            {form.activityType === "project" ? (
              <SearchSelect
                value={form.taskId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, taskId: String(value) }))
                }
                options={taskOptions}
                placeholder="Seleziona progetto…"
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
                <SelectTrigger className={inputCls} aria-label="Attivita interna">
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

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
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
              className={inputCls}
              aria-label="Ore"
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
              className={inputCls}
              aria-label="Minuti"
            />

            <Input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((current) => ({ ...current, date: event.target.value }))
              }
              disabled={isSubmitting}
              className={inputCls}
              aria-label="Data"
            />
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
              className={cn(inputCls, "max-w-md")}
              aria-label="Luogo pranzo"
            />
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleCreate}
              disabled={isSubmitting}
              className={cn(inputCls, "min-w-[160px]")}
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
      </TableCell>
    </TableRow>
  );
}
