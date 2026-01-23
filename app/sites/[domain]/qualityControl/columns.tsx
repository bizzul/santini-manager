"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Check, PauseIcon, X } from "lucide-react";
import { statusText } from "@/components/boxing/mobilePage";
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
    accessorKey: "taskDetails.unique_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Progetto" />
    ),
    cell: ({ row }) => {
      // Support both taskDetails (legacy) and task (new) structures
      const taskDetails = row.original.taskDetails || row.original.task;
      if (!taskDetails?.unique_code) return "-";
      
      // Get client name from taskDetails or task
      const client = taskDetails.Client || taskDetails.client;
      const clientName = client?.businessName ||
        (client?.individualFirstName && client?.individualLastName
          ? `${client.individualFirstName} ${client.individualLastName}`
          : null);
      
      if (clientName) {
        return (
          <div className="flex flex-col">
            <span className="font-medium">{taskDetails.unique_code}</span>
            <span className="text-xs text-muted-foreground">{clientName}</span>
          </div>
        );
      }
      return taskDetails.unique_code;
    },
  },
  {
    accessorKey: "qualityControls",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Posizioni" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { qualityControls } = row.original;
      return (
        <div suppressHydrationWarning>
          {qualityControls.map((data: any, index: number) => (
            <li key={index}>
              {data.position_nr} - {statusText(data.passed)}
            </li>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "userDetails",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Utente" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { userDetails } = row.original;
      return (
        <div suppressHydrationWarning>
          {userDetails.given_name} {userDetails.family_name}
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
