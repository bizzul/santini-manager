"use client";

import { SellProduct, Task } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../../components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import Image from "next/image";

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "unique_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codice" />
    ),
  },
  {
    accessorKey: "client.businessName",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cliente" />
    ),
  },
  {
    accessorKey: "column",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pos. Attuale" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { kanban, column } = row.original;
      return `${kanban?.title} => ${column?.title}`;
    },
  },
  {
    accessorKey: "other",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Note" />
    ),
  },
  {
    accessorKey: "deliveryDate",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data di consegna" />
    ),
    cell: ({ row }) => {
      const { deliveryDate } = row.original;

      // Check if website includes the protocol, if not, prepend it.
      const formattedDate = deliveryDate?.toLocaleDateString();

      return <div suppressHydrationWarning>{formattedDate}</div>;
    },
  },
  {
    accessorKey: "sellPrice",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valore" />
    ),
  },
  {
    accessorKey: "archived",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Archiviato" />
    ),
    cell: ({ row }) => {
      const { archived } = row.original;

      return archived ? "Si" : "No";
    },
  },
  {
    accessorKey: "actions_user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ultima mod." />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const actions = row.original.Action || [];
      const updateDate = new Date(row.original.updated_at);

      if (!Array.isArray(actions) || actions.length === 0) {
        return "-";
      }

      // Safely sort actions and get the most recent one
      const mostRecentAction =
        actions.length > 0
          ? actions.sort(
              (a: any, b: any) =>
                new Date(b.createdAt).valueOf() -
                new Date(a.createdAt).valueOf()
            )[0]
          : null;

      // Safely access nested properties
      const userPicture = mostRecentAction?.User?.picture;
      const userAuthId = mostRecentAction?.User?.authId;
      const userGivenName = mostRecentAction?.User?.given_name;

      if (!mostRecentAction || !userPicture) {
        return "-";
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-2">
                {userPicture ? (
                  <Image
                    src={userPicture}
                    alt={userGivenName || "User"}
                    width={40}
                    height={40}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                )}
                <span>{updateDate.toLocaleDateString()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{userGivenName || "Unknown User"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
