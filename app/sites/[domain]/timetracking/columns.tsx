"use client";

import { useEffect, useMemo, useState } from "react";
import { Timetracking, Task } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  Check,
  CheckSquare,
  Loader2,
  Pencil,
  X,
  XIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";
import { DateManager } from "@/package/utils/dates/date-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchSelect } from "@/components/ui/search-select";
import { useToast } from "@/components/ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProjectLabel } from "@/lib/project-label";
import { cn } from "@/lib/utils";

interface InternalActivity {
  id: string;
  code: string;
  label: string;
  site_id: string | null;
  sort_order: number;
}

type TimetrackingRow = Timetracking & {
  user?: {
    given_name?: string;
    family_name?: string;
  };
  roles?: Array<{
    role?: {
      id?: number;
      name?: string;
    };
  }>;
  task?: {
    unique_code?: string;
    title?: string;
    Client?: {
      businessName?: string;
      individualFirstName?: string;
      individualLastName?: string;
    };
  };
  internal_activity?: string;
  lunch_offsite?: boolean;
  lunch_location?: string | null;
};

const DEFAULT_AVATAR_COLOR = "#6366f1";

function buildUserInitialsFromRow(user: any): string {
  const stored = (user?.initials || "").toString().trim();
  if (stored) return stored.slice(0, 2).toUpperCase();

  const fromGiven = (user?.given_name || "").trim().charAt(0);
  const fromFamily = (user?.family_name || "").trim().charAt(0);
  const composed = `${fromGiven}${fromFamily}`.toUpperCase();
  if (composed) return composed;

  return (user?.email || "?").trim().charAt(0).toUpperCase() || "?";
}

function UserBadge({ user }: { user: any }) {
  const color = (user?.color as string | undefined) || DEFAULT_AVATAR_COLOR;
  const initials = buildUserInitialsFromRow(user);

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

type TimetrackingTaskOption = Task & {
  unique_code?: string | null;
  title?: string | null;
  name?: string | null;
  Client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
};

const buildTimetrackingPayload = (
  rowData: TimetrackingRow,
  updates: Record<string, string | number | boolean | null | undefined>
) => ({
  hours: rowData.hours ?? 0,
  minutes: rowData.minutes ?? 0,
  description: rowData.description ?? "",
  date: rowData.created_at,
  task: rowData.task_id?.toString() ?? "",
  userId: rowData.employee_id?.toString() ?? "",
  roles: rowData.roles?.[0]?.role?.id ?? rowData.roles?.[0],
  lunchOffsite: rowData.lunch_offsite ?? false,
  lunchLocation: rowData.lunch_location ?? "",
  ...updates,
});

const createTimetrackingUpdateHandler = (domain?: string) => {
  return async (
    rowData: TimetrackingRow,
    updates: Record<string, string | number | boolean | null | undefined>
  ): Promise<{ success?: boolean; error?: string }> => {
    try {
      const result = await editItem(buildTimetrackingPayload(rowData, updates), rowData.id, domain);
      if (result?.message || result?.error) {
        return { error: result.message || result.error };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

// Handler for inline editing timetracking
const createTimetrackingEditHandler = (domain?: string) => {
  const updateTimetracking = createTimetrackingUpdateHandler(domain);
  return async (
    rowData: TimetrackingRow,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    return updateTimetracking(rowData, { [field]: newValue });
  };
};

// Helper to find all scrollable ancestors and save their scroll positions
const saveScrollPositions = (
  element: HTMLElement | null
): Array<{ el: HTMLElement; scrollTop: number }> => {
  const positions: Array<{ el: HTMLElement; scrollTop: number }> = [];
  let current = element;
  while (current) {
    const { overflow, overflowY } = window.getComputedStyle(current);
    if (
      overflow === "auto" ||
      overflow === "scroll" ||
      overflowY === "auto" ||
      overflowY === "scroll"
    ) {
      positions.push({ el: current, scrollTop: current.scrollTop });
    }
    current = current.parentElement;
  }
  return positions;
};

function formatTrackedTime(hours?: number | null, minutes?: number | null): string {
  return `${hours || 0}h ${minutes || 0}m`;
}

const saveActionButtonClassName =
  "h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700";
const cancelActionButtonClassName =
  "h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-700";

function TimetrackingHoursCell({
  rowData,
  editable,
  onSave,
}: {
  rowData: TimetrackingRow;
  editable: boolean;
  onSave: (
    rowData: TimetrackingRow,
    updates: Record<string, string | number | boolean | null | undefined>
  ) => Promise<{ success?: boolean; error?: string }>;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hours, setHours] = useState(String(rowData.hours || 0));
  const [minutes, setMinutes] = useState(String(rowData.minutes || 0));
  const [optimisticValue, setOptimisticValue] = useState<{
    hours: number;
    minutes: number;
  } | null>(null);

  useEffect(() => {
    const nextHours = String(optimisticValue?.hours ?? rowData.hours ?? 0);
    const nextMinutes = String(optimisticValue?.minutes ?? rowData.minutes ?? 0);
    setHours(nextHours);
    setMinutes(nextMinutes);
  }, [optimisticValue, rowData.hours, rowData.minutes]);

  const effectiveHours = optimisticValue?.hours ?? rowData.hours ?? 0;
  const effectiveMinutes = optimisticValue?.minutes ?? rowData.minutes ?? 0;

  const handleSave = async () => {
    const nextHours = Math.max(0, Math.min(24, parseInt(hours.replace(/\D/g, "") || "0", 10)));
    const nextMinutes = Math.max(0, Math.min(59, parseInt(minutes.replace(/\D/g, "") || "0", 10)));

    if (nextHours === (rowData.hours || 0) && nextMinutes === (rowData.minutes || 0)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setOptimisticValue({ hours: nextHours, minutes: nextMinutes });
    try {
      const result = await onSave(rowData, {
        hours: nextHours,
        minutes: nextMinutes,
      });

      if (result?.error) {
        setOptimisticValue(null);
        toast({
          variant: "destructive",
          description: result.error,
        });
        return;
      }

      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setHours(String(rowData.hours || 0));
    setMinutes(String(rowData.minutes || 0));
    setIsEditing(false);
  };

  if (!editable) {
    return (
      <span className="whitespace-nowrap">
        {formatTrackedTime(effectiveHours, effectiveMinutes)}
      </span>
    );
  }

  if (isEditing) {
    return (
      <div className="flex min-w-[180px] items-center gap-2">
        <Input
          value={hours}
          onChange={(event) => setHours(event.target.value.replace(/\D/g, ""))}
          className="h-8 w-14"
          inputMode="numeric"
          placeholder="0"
          disabled={isSaving}
        />
        <span className="text-xs text-muted-foreground">h</span>
        <Input
          value={minutes}
          onChange={(event) => setMinutes(event.target.value.replace(/\D/g, ""))}
          className="h-8 w-14"
          inputMode="numeric"
          placeholder="0"
          disabled={isSaving}
        />
        <span className="text-xs text-muted-foreground">m</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={saveActionButtonClassName}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cancelActionButtonClassName}
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group relative flex min-h-[32px] w-full items-center justify-between rounded px-1 -mx-1 pr-6 text-left transition-colors hover:bg-muted/50"
      onClick={() => setIsEditing(true)}
      title="Clicca per modificare le ore"
    >
      <span className="whitespace-nowrap">
        {formatTrackedTime(effectiveHours, effectiveMinutes)}
      </span>
      <Pencil className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function TimetrackingProjectCell({
  rowData,
  tasks,
  editable,
  onSave,
}: {
  rowData: TimetrackingRow;
  tasks: TimetrackingTaskOption[];
  editable: boolean;
  onSave: (
    rowData: TimetrackingRow,
    updates: Record<string, string | number | boolean | null | undefined>
  ) => Promise<{ success?: boolean; error?: string }>;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticTaskId, setOptimisticTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState(rowData.task_id?.toString() || "");

  useEffect(() => {
    setSelectedTaskId(optimisticTaskId ?? rowData.task_id?.toString() ?? "");
  }, [optimisticTaskId, rowData.task_id]);

  const taskOptions = useMemo(
    () =>
      tasks.map((task) => ({
        value: task.id?.toString() || "",
        label: getProjectLabel(task),
      })),
    [tasks]
  );

  const currentTaskId = optimisticTaskId ?? rowData.task_id?.toString() ?? "";
  const currentTask =
    tasks.find((task) => task.id?.toString() === currentTaskId) || rowData.task || null;

  const handleSave = async () => {
    if (!selectedTaskId || selectedTaskId === (rowData.task_id?.toString() || "")) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setOptimisticTaskId(selectedTaskId);
    try {
      const result = await onSave(rowData, { task: selectedTaskId });

      if (result?.error) {
        setOptimisticTaskId(null);
        toast({
          variant: "destructive",
          description: result.error,
        });
        return;
      }

      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (rowData.internal_activity) {
    const currentActivity = rowData.internal_activity;
    return <span className="text-muted-foreground italic">{currentActivity}</span>;
  }

  if (!editable) {
    return renderProjectValue(currentTask);
  }

  if (isEditing) {
    return (
      <div className="flex min-w-[260px] items-center gap-2">
        <div className="min-w-0 flex-1">
          <SearchSelect
            value={selectedTaskId}
            onValueChange={(value) => setSelectedTaskId(String(value))}
            options={taskOptions}
            placeholder="Seleziona progetto..."
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`${saveActionButtonClassName} shrink-0`}
          onClick={handleSave}
          disabled={isSaving || !selectedTaskId}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`${cancelActionButtonClassName} shrink-0`}
          onClick={() => {
            setSelectedTaskId(currentTaskId);
            setIsEditing(false);
          }}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group relative flex min-h-[32px] w-full items-start justify-between gap-2 rounded px-1 -mx-1 pr-6 text-left transition-colors hover:bg-muted/50"
      onClick={() => setIsEditing(true)}
      title="Clicca per modificare il progetto"
    >
      <div className="min-w-0 flex-1">{renderProjectValue(currentTask)}</div>
      <Pencil className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function DescriptionCell({
  rowData,
  editable,
  onSave,
}: {
  rowData: TimetrackingRow;
  editable: boolean;
  onSave: (
    rowData: TimetrackingRow,
    field: string,
    newValue: string | number | boolean | null
  ) => Promise<{ success?: boolean; error?: string }>;
}) {
  const description = (rowData.description ?? "").toString();

  // Override the EditableCell internal `truncate` so the description span
  // wraps onto up to three lines instead of being clipped to a single one.
  // The `[&>span]:!whitespace-normal` removes the `nowrap` from the
  // underlying span, while `[&>span]:!line-clamp-3` caps it at three
  // visible lines with an ellipsis, and `flex items-start` keeps the
  // pencil icon aligned to the top corner instead of pushed mid-line.
  const editableNode = (
    <EditableCell
      value={rowData.description}
      row={{ original: rowData }}
      field="description"
      type="text"
      onSave={onSave}
      editable={editable}
      activateOnSingleClick={editable}
      placeholder="-"
      className={cn(
        "w-full min-w-0 items-start py-1",
        "[&>span]:min-w-0 [&>span]:flex-1 [&>span]:!whitespace-normal",
        "[&>span]:!overflow-hidden [&>span]:!line-clamp-3 [&>span]:break-words"
      )}
    />
  );

  if (!description.trim()) {
    return <div className="min-w-0">{editableNode}</div>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="block w-full min-w-0">{editableNode}</div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-md whitespace-pre-line text-left leading-snug"
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
}

function renderProjectValue(task: TimetrackingRow["task"] | TimetrackingTaskOption | null) {
  if (!task) {
    return <span className="text-muted-foreground">-</span>;
  }

  const clientName =
    task.Client?.businessName ||
    (task.Client?.individualFirstName && task.Client?.individualLastName
      ? `${task.Client.individualFirstName} ${task.Client.individualLastName}`
      : null);

  if (!task.unique_code) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-col">
      <span className="font-medium">{task.unique_code}</span>
      {clientName && <span className="text-xs text-muted-foreground">{clientName}</span>}
    </div>
  );
}

export const createColumns = (
  domain?: string,
  internalActivities: InternalActivity[] = [],
  tasks: TimetrackingTaskOption[] = [],
  editable = true
): ColumnDef<TimetrackingRow>[] => {
  const handleTimetrackingEdit = createTimetrackingEditHandler(domain);
  const handleTimetrackingUpdate = createTimetrackingUpdateHandler(domain);

  const selectionColumn: ColumnDef<TimetrackingRow> = {
      id: "select",
      meta: {
        headClassName: "w-[32px] px-1",
        cellClassName: "w-[32px] px-1",
      },
      header: ({ table }) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            const scrollPositions = saveScrollPositions(
              e.currentTarget as HTMLElement
            );
            const windowScrollY = window.scrollY;

            table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected());

            requestAnimationFrame(() => {
              scrollPositions.forEach(({ el, scrollTop }) => {
                el.scrollTop = scrollTop;
              });
              window.scrollTo({ top: windowScrollY, behavior: "instant" });
            });
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={() => {}}
            aria-label="Seleziona tutti"
            tabIndex={-1}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            const scrollPositions = saveScrollPositions(
              e.currentTarget as HTMLElement
            );
            const windowScrollY = window.scrollY;

            row.toggleSelected(!row.getIsSelected());

            requestAnimationFrame(() => {
              scrollPositions.forEach(({ el, scrollTop }) => {
                el.scrollTop = scrollTop;
              });
              window.scrollTo({ top: windowScrollY, behavior: "instant" });
            });
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={() => {}}
            aria-label="Seleziona riga"
            tabIndex={-1}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    };

  const baseColumns: ColumnDef<TimetrackingRow>[] = [
    {
      accessorKey: "user",
      accessorFn: (row) =>
        row.user
          ? `${row.user.family_name} ${row.user.given_name}`
          : "Unknown User",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Creato da" />
      ),
      id: "fullName",
      filterFn: "includesString",
      enableColumnFilter: true,
      enableGlobalFilter: true,
      meta: {
        headClassName: "w-[200px] px-2",
        cellClassName: "w-[200px] px-2 overflow-hidden",
      },
      cell: ({ row }) => {
        const { user } = row.original;
        const label = user
          ? `${user.family_name ?? ""} ${user.given_name ?? ""}`.trim() ||
            "Unknown User"
          : "Unknown User";
        return (
          <span className="flex min-w-0 items-center gap-2">
            <UserBadge user={user} />
            <span className="truncate">{label}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "roles",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ruolo" />
      ),
      meta: {
        headClassName: "w-[100px] px-2",
        cellClassName: "w-[100px] px-2 overflow-hidden",
      },
      cell: ({ row }) => {
        const { roles, internal_activity } = row.original;
        if (internal_activity) {
          const activity = internalActivities.find((a) => a.code === internal_activity);
          return (
            <span className="text-muted-foreground italic">
              {activity?.label || internal_activity}
            </span>
          );
        }
        if (roles?.length) {
          return (
            <ul>
              {roles.map((roleEntry: any, index: number) => (
                <li key={roleEntry.role?.id || index}>{roleEntry.role?.name}</li>
              ))}
            </ul>
          );
        }
        return "Nessun ruolo";
      },
    },
    {
      accessorKey: "hours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ore" />
      ),
      meta: {
        headClassName: "w-[88px] px-2",
        cellClassName: "w-[88px] px-2 whitespace-nowrap",
      },
      cell: ({ row }) => (
        <TimetrackingHoursCell
          rowData={row.original}
          editable={editable}
          onSave={handleTimetrackingUpdate}
        />
      ),
    },
    {
      accessorKey: "use_cnc",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CNC" />
      ),
      meta: {
        headClassName: "w-[44px] px-1 text-center",
        cellClassName: "w-[44px] px-1 text-center",
      },
      cell: ({ row }) => {
        const { use_cnc } = row.original;
        if (use_cnc) {
          return <CheckSquare className="mx-auto h-4 w-4" />;
        }
        return <XIcon className="mx-auto h-4 w-4 text-muted-foreground" />;
      },
    },
    {
      accessorKey: "task.unique_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Progetto" />
      ),
      meta: {
        headClassName: "w-[140px] px-2",
        cellClassName: "w-[140px] px-2 overflow-hidden",
      },
      cell: ({ row }) => (
        <TimetrackingProjectCell
          rowData={row.original}
          tasks={tasks}
          editable={editable}
          onSave={handleTimetrackingUpdate}
        />
      ),
    },
    {
      accessorKey: "lunch_location",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Luogo" />
      ),
      meta: {
        headClassName: "w-[120px] px-2",
        cellClassName: "w-[120px] px-2",
      },
      cell: ({ row }) => (
        <EditableCell
          value={row.original.lunch_location}
          row={row}
          field="lunchLocation"
          type="text"
          onSave={handleTimetrackingEdit}
          editable={editable}
          activateOnSingleClick={editable}
          placeholder="-"
        />
      ),
    },
    {
      accessorKey: "lunch_offsite",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pranzo" />
      ),
      meta: {
        headClassName: "w-[60px] px-1 text-center",
        cellClassName: "w-[60px] px-1 text-center",
      },
      cell: ({ row }) => (
        <EditableCell
          value={row.original.lunch_offsite}
          row={row}
          field="lunchOffsite"
          type="checkbox"
          onSave={handleTimetrackingEdit}
          editable={editable}
          activateOnSingleClick={editable}
          className="!justify-center"
        />
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrizione" />
      ),
      meta: {
        headClassName: "w-[280px] px-2",
        cellClassName: "w-[280px] px-2 overflow-hidden align-top",
      },
      cell: ({ row }) => (
        <DescriptionCell
          rowData={row.original}
          editable={editable}
          onSave={handleTimetrackingEdit}
        />
      ),
    },
    {
      id: "data",
      accessorFn: (row) => {
        const value = row.created_at as string | Date | null | undefined;
        if (!value) return null;
        const parsed = value instanceof Date ? value : new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      },
      sortingFn: "datetime",
      sortUndefined: "last",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data" />
      ),
      meta: {
        headClassName: "w-[110px] px-2",
        cellClassName: "w-[110px] px-2",
      },
      cell: ({ row }) => (
        <EditableCell
          value={row.original.created_at}
          row={row}
          field="date"
          type="date"
          onSave={handleTimetrackingEdit}
          editable={editable}
          activateOnSingleClick={editable}
          formatter={(value) => DateManager.formatEUDate(String(value))}
          placeholder="N/A"
          className="min-w-0 [&>span]:min-w-0 [&>span]:flex-1"
        />
      ),
    },
  ];

  if (!editable) {
    return baseColumns;
  }

  return [
    selectionColumn,
    ...baseColumns,
    {
      id: "actions",
      header: "Azioni",
      meta: {
        headClassName: "w-[64px] px-2",
        cellClassName: "w-[64px] px-2",
      },
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ];
};

// Legacy export for backward compatibility
export const columns = createColumns(undefined, []);
