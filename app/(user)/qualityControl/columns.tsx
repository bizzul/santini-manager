"use client";

import { QualityControl, SellProduct } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../../components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Check, CheckCheck, Cross, PauseIcon, X } from "lucide-react";
import { statusText } from "../../../components/boxing/mobilePage";
export const columns: ColumnDef<QualityControl>[] = [
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
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codice" />
    ),
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
