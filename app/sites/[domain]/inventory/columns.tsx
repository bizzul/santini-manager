"use client";

import { Product } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "../../../components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "inventoryId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codice" />
    ),
  },
  {
    accessorKey: "product_category.name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
  },
  {
    accessorKey: "description",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="N. Articolo" />
    ),
  },
  {
    accessorKey: "name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: "supplierInfo.name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fornitore" />
    ),
  },
  {
    accessorKey: "dimensions",

    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Misure" />
    ),
    cell: ({ row }) => {
      const { width, height, length } = row.original;
      return `${width}x${height}x${length}`;
    },
  },
  {
    accessorKey: "quantity",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Qta." />
    ),
  },
  {
    accessorKey: "unit_price",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Prezzo unitario" />
    ),
  },
  {
    accessorKey: "total_price",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Prezzo totale" />
    ),
    cell: ({ row }) => {
      const price = row.original.total_price;
      return price?.toFixed(2);
    },
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
