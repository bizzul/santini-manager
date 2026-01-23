"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import ImageGallery from "./imageGallery";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

type ErrorTrackingRow = {
  id: number;
  created_at?: Date;
  error_type?: string;
  error_category?: string;
  position?: string;
  description?: string;
  user?: {
    given_name?: string;
    family_name?: string;
  };
  supplier?: {
    name?: string;
  };
  task?: {
    unique_code?: string;
    title?: string;
    Client?: {
      businessName?: string;
      individualFirstName?: string;
      individualLastName?: string;
    };
  };
  files?: any[];
  [key: string]: any;
};

// Handler for inline editing errortracking
// Note: editItem requires files parameter, we pass empty array for inline edits
const createErrorTrackingEditHandler = () => {
  return async (
    rowData: ErrorTrackingRow,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData = {
      position: rowData.position,
      description: rowData.description,
      errorCategory: rowData.error_category,
      errorType: rowData.error_type,
      [field === "error_type" ? "errorType" : field === "error_category" ? "errorCategory" : field]: newValue,
    };

    try {
      const result = await editItem(formData, rowData.id, []);
      if (result?.error) {
        return { error: result.error };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

export const createColumns = (): ColumnDef<ErrorTrackingRow>[] => {
  const handleErrorTrackingEdit = createErrorTrackingEditHandler();

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
      accessorKey: "user.given_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Creato da" />
      ),
      cell: ({ row }) => {
        const { user } = row.original;
        if (!user) return "-";
        return `${user.given_name || ""} ${user.family_name || ""}`.trim() || "-";
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Creato il" />
      ),
      cell: ({ row }) => {
        const { created_at } = row.original;
        if (!created_at) return "-";
        const formattedDate = created_at.toLocaleDateString();
        return <div suppressHydrationWarning>{formattedDate}</div>;
      },
    },
    {
      accessorKey: "error_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipologia" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.error_type}
          row={row}
          field="error_type"
          type="text"
          onSave={handleErrorTrackingEdit}
        />
      ),
    },
    {
      accessorKey: "error_category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.error_category}
          row={row}
          field="error_category"
          type="text"
          onSave={handleErrorTrackingEdit}
        />
      ),
    },
    {
      accessorKey: "supplier.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fornitore" />
      ),
    },
    {
      accessorKey: "position",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Posizione" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.position}
          row={row}
          field="position"
          type="text"
          onSave={handleErrorTrackingEdit}
        />
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
          onSave={handleErrorTrackingEdit}
        />
      ),
    },
    {
      accessorKey: "files.image",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Immagini" />
      ),
      cell: ({ row }) => {
        const { files } = row.original;
        if (!files || files.length === 0) return <div>N/A</div>;
        return <ImageGallery files={files} />;
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
