"use client";

import { Client, Product } from "@prisma/client";
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
    accessorKey: "businessName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Azienda" />
    ),
  },
  {
    accessorKey: "individualFirstName",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: "zipCode",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CAP" />
    ),
  },
  {
    accessorKey: "city",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Citta" />
    ),
  },
  {
    accessorKey: "address",

    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Indirizzo" />
    ),
  },
  {
    accessorKey: "phone",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefono" />
    ),
  },
  {
    accessorKey: "clientType",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipologia" />
    ),
  },
  {
    accessorKey: "actions.user.image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ultima mod." />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const actions = row.original.Action;
      const mostRecentAction = actions.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
      )[0];
      return mostRecentAction &&
        mostRecentAction.User &&
        mostRecentAction.User.picture ? (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Image
                  src={mostRecentAction.User.picture}
                  alt={mostRecentAction.User.authId}
                  width={40}
                  height={40}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{mostRecentAction.User.given_name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      ) : (
        "-"
      );
    },
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
