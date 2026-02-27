"use client";

import { Timetracking } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { CheckSquare, XIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

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
};

// Handler for inline editing timetracking
const createTimetrackingEditHandler = (domain?: string) => {
  return async (
    rowData: TimetrackingRow,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    // Map field names to validation schema - include all required fields for edit
    const formData: any = {
      hours: rowData.hours,
      minutes: rowData.minutes,
      description: rowData.description,
      date: rowData.created_at,
      task: rowData.task_id?.toString(),
      userId: rowData.employee_id?.toString(),
      roles: rowData.roles?.[0]?.role?.id ?? rowData.roles?.[0],
      [field]: newValue,
    };

    try {
      const result = await editItem(formData, rowData.id, domain);
      if (result?.message || result?.error) {
        return { error: result.message || result.error };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
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

export const createColumns = (domain?: string, internalActivities: InternalActivity[] = []): ColumnDef<TimetrackingRow>[] => {
  const handleTimetrackingEdit = createTimetrackingEditHandler(domain);

  return [
    {
      id: "select",
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
    },
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
      cell: ({ row }) => {
        const { user } = row.original;
        if (user) {
          return `${user.family_name} ${user.given_name}`;
        }
        return "Unknown User";
      },
    },
    {
      accessorKey: "roles",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ruolo" />
      ),
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
      cell: ({ row }) => {
        const hours = row.original.hours || 0;
        const minutes = row.original.minutes || 0;
        return (
          <div className="flex items-center gap-0.5">
            <EditableCell
              value={hours}
              row={row}
              field="hours"
              type="number"
              onSave={handleTimetrackingEdit}
              className="w-6 text-center"
            />
            <span className="text-muted-foreground text-xs">h</span>
            <EditableCell
              value={minutes}
              row={row}
              field="minutes"
              type="number"
              onSave={handleTimetrackingEdit}
              className="w-6 text-center"
            />
            <span className="text-muted-foreground text-xs">m</span>
          </div>
        );
      },
    },
    {
      accessorKey: "totalTime",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Totale" />
      ),
      cell: ({ row }) => {
        const { totalTime } = row.original;
        if (!totalTime) return "0 ore e 0 minuti";

        const hours = Math.floor(totalTime);
        const minutes = Math.round((totalTime - hours) * 60);

        return `${hours} ore e ${minutes} minuti`;
      },
    },
    {
      accessorKey: "use_cnc",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CNC" />
      ),
      cell: ({ row }) => {
        const { use_cnc } = row.original;
        if (use_cnc) {
          return <CheckSquare />;
        } else {
          return <XIcon />;
        }
      },
    },
    {
      accessorKey: "task.unique_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Progetto" />
      ),
      cell: ({ row }) => {
        const { task } = row.original;
        if (!task?.unique_code) return "-";
        
        // Get client name
        const clientName = task.Client?.businessName ||
          (task.Client?.individualFirstName && task.Client?.individualLastName
            ? `${task.Client.individualFirstName} ${task.Client.individualLastName}`
            : null);
        
        if (clientName) {
          return (
            <div className="flex flex-col">
              <span className="font-medium">{task.unique_code}</span>
              <span className="text-xs text-muted-foreground">{clientName}</span>
            </div>
          );
        }
        return task.unique_code;
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descrizione" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.description}
          row={row}
          field="description"
          type="text"
          onSave={handleTimetrackingEdit}
        />
      ),
    },
    {
      accessorKey: "data",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Data" />
      ),
      cell: ({ row }) => {
        const { created_at } = row.original;
        if (!created_at) return <div>N/A</div>;
        const formattedDate = new Date(created_at).toLocaleDateString();
        return <div suppressHydrationWarning>{formattedDate}</div>;
      },
    },
    {
      id: "actions",
      header: "Azioni",
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ];
};

// Legacy export for backward compatibility
export const columns = createColumns(undefined, []);
