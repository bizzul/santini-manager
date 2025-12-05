"use client";

import { Client, Product } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export const columns: ColumnDef<Client>[] = [
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
    accessorKey: "businessName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => {
      const client = row.original;
      if (client.clientType === "BUSINESS") {
        return client.businessName || "-";
      } else {
        const firstName = client.individualFirstName || "";
        const lastName = client.individualLastName || "";
        return `${firstName} ${lastName}`.trim() || "-";
      }
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
  // {
  //   accessorKey: "action.user.image",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Ultima mod." />
  //   ),
  //   cell: ({ row }) => {
  //     //@ts-ignore
  //     const actions = row.original.Action;
  //     const mostRecentAction = actions.sort(
  //       (a: any, b: any) =>
  //         new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
  //     )[0];
  //     return mostRecentAction &&
  //       mostRecentAction.User &&
  //       mostRecentAction.User.picture ? (
  //       <>
  //         <TooltipProvider>
  //           <Tooltip>
  //             <TooltipTrigger>
  //               <Image
  //                 src={mostRecentAction.User.picture}
  //                 alt={mostRecentAction.User.authId}
  //                 width={40}
  //                 height={40}
  //               />
  //             </TooltipTrigger>
  //             <TooltipContent>
  //               <p>{mostRecentAction.User.given_name}</p>
  //             </TooltipContent>
  //           </Tooltip>
  //         </TooltipProvider>
  //       </>
  //     ) : (
  //       "-"
  //     );
  //   },
  // },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
