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

// Extended Client type with lastAction
type ClientWithAction = Client & {
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

export const columns: ColumnDef<ClientWithAction>[] = [
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
  },
  {
    accessorKey: "zipCode",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CAP" />
    ),
  },
  {
    accessorKey: "city",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Citta" />
    ),
  },
  {
    accessorKey: "mobilePhone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefono" />
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
