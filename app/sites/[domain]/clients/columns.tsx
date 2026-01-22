"use client";

import { Client } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

// Extended Client type with lastAction
export type ClientWithAction = Client & {
  lastAction?: {
    createdAt: string;
    type: string;
    User?: {
      given_name: string | null;
      family_name: string | null;
      picture: string | null;
      initials: string | null;
    };
  } | null;
};

// Handler for inline editing clients
const createClientEditHandler = (domain: string) => {
  return async (
    rowData: ClientWithAction,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    // Build complete form data with all current values plus the changed field
    // Use fallback values that satisfy validation requirements
    const formData = {
      id: rowData.id,
      individualTitle: rowData.individualTitle || "",
      businessName: rowData.businessName || "",
      individualFirstName: rowData.individualFirstName || "",
      individualLastName: rowData.individualLastName || "",
      // Required fields - use existing value or placeholder if empty
      address: rowData.address || "N/A",
      city: rowData.city || "N/A",
      clientType: rowData.clientType || "INDIVIDUAL",
      countryCode: rowData.countryCode || "CH",
      email: rowData.email || "",
      phone: rowData.mobilePhone || "",
      clientLanguage: rowData.clientLanguage || "it",
      // zipCode is required and must be a number
      zipCode: rowData.zipCode ?? 0,
      // Override with the changed field
      [field]: newValue,
    };

    // Map field names if needed
    if (field === "mobilePhone") {
      formData.phone = newValue as string;
    }

    // Ensure zipCode is always a number for validation
    if (field === "zipCode") {
      formData.zipCode = typeof newValue === 'number' ? newValue : (parseInt(String(newValue)) || 0);
    }

    try {
      const result = await editItem(formData as Client, rowData.id, domain);
      if (result?.error || result?.message) {
        return { error: result.error || result.message };
      }
      return { success: true };
    } catch (error: any) {
      console.error("Client inline edit error:", error);
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

export const createColumns = (
  domain: string
): ColumnDef<ClientWithAction>[] => {
  const handleClientEdit = createClientEditHandler(domain);

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
      accessorKey: "clientType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo" />
      ),
      cell: ({ row }) => {
        const clientType = row.original.clientType;
        return clientType === "BUSINESS" ? "Azienda" : "Privato";
      },
    },
    {
      id: "name",
      accessorFn: (row) => {
        if (row.clientType === "BUSINESS") {
          return row.businessName || "";
        } else {
          const firstName = row.individualFirstName || "";
          const lastName = row.individualLastName || "";
          return `${firstName} ${lastName}`.trim();
        }
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome" />
      ),
      cell: ({ row }) => {
        const value = row.getValue("name") as string;
        return value || "-";
      },
    },
    {
      accessorKey: "address",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Indirizzo" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.address}
          row={row}
          field="address"
          type="text"
          onSave={handleClientEdit}
        />
      ),
    },
    {
      accessorKey: "zipCode",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CAP" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.zipCode}
          row={row}
          field="zipCode"
          type="number"
          onSave={handleClientEdit}
        />
      ),
    },
    {
      accessorKey: "city",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Citta" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.city}
          row={row}
          field="city"
          type="text"
          onSave={handleClientEdit}
        />
      ),
    },
    {
      accessorKey: "mobilePhone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Telefono" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.mobilePhone}
          row={row}
          field="mobilePhone"
          type="text"
          onSave={handleClientEdit}
        />
      ),
    },
    {
      accessorKey: "lastAction.createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ultima modifica" />
      ),
      cell: ({ row }) => {
        const lastAction = row.original.lastAction;
        if (!lastAction?.createdAt) return "-";

        const date = new Date(lastAction.createdAt);
        const timeAgo = formatDistanceToNow(date, {
          addSuffix: true,
          locale: it,
        });
        const fullDate = date.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-help">
                  {timeAgo}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{fullDate}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "lastAction.User",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Modificato da" />
      ),
      cell: ({ row }) => {
        const lastAction = row.original.lastAction;
        const user = lastAction?.User;

        if (!user) return "-";

        const displayName =
          user.given_name && user.family_name
            ? `${user.given_name} ${user.family_name}`
            : user.given_name || "Utente";

        // Generate initials from name
        const initials =
          user.initials ||
          (user.given_name && user.family_name
            ? `${user.given_name.charAt(0)}${user.family_name.charAt(0)}`
            : user.given_name?.charAt(0) || "U");

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-primary">{initials}</span>
            </div>
            <span className="text-sm truncate">{displayName}</span>
          </div>
        );
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
export const columns = createColumns("");
