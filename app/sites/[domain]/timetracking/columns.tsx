"use client";

import { Timetracking } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { CheckSquare, XIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

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
  };
};

// Handler for inline editing timetracking
const createTimetrackingEditHandler = (domain?: string) => {
  return async (
    rowData: TimetrackingRow,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    // Map field names to validation schema
    const formData: any = {
      hours: rowData.hours,
      minutes: rowData.minutes,
      description: rowData.description,
      descriptionCat: rowData.description_type,
      date: rowData.created_at,
      [field === "description_type" ? "descriptionCat" : field]: newValue,
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

export const createColumns = (domain?: string): ColumnDef<TimetrackingRow>[] => {
  const handleTimetrackingEdit = createTimetrackingEditHandler(domain);

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleziona tutti"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleziona riga"
        />
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
        const { roles } = row.original;
        if (roles?.length) {
          return (
            <ul>
              {roles.map((roleEntry: any, index: number) => (
                <li key={roleEntry.role?.id || index}>{roleEntry.role?.name}</li>
              ))}
            </ul>
          );
        } else {
          return "Nessun ruolo";
        }
      },
    },
    {
      accessorKey: "hours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ore" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.hours}
          row={row}
          field="hours"
          type="number"
          onSave={handleTimetrackingEdit}
        />
      ),
    },
    {
      accessorKey: "minutes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Minuti" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.minutes}
          row={row}
          field="minutes"
          type="number"
          onSave={handleTimetrackingEdit}
        />
      ),
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
      accessorKey: "description_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo Desc." />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.description_type}
          row={row}
          field="description_type"
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
export const columns = createColumns();
