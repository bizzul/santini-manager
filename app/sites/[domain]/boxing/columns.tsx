"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Check, CheckCheck, Cross, PauseIcon, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<any>[] = [
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
    accessorKey: "passed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completato?" />
    ),
    cell: ({ row }) => {
      const { passed } = row.original;

      let icon;
      switch (passed) {
        case "NOT_DONE":
          icon = <X />; // Replace with your "Not Done" icon
          break;
        case "PARTIALLY_DONE":
          icon = <PauseIcon />; // Replace with your "Partially Done" icon
          break;
        case "DONE":
          icon = <Check />; // Replace with your "Done" icon
          break;
        default:
          icon = null; // or some default icon or text
      }

      return <div suppressHydrationWarning>{icon}</div>;
    },
  },
  {
    accessorKey: "task.unique_code",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codice" />
    ),
  },
  {
    accessorKey: "user",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Utente" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { user } = row.original;
      return (
        <div suppressHydrationWarning>
          {user.given_name} {user.family_name}
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
