"use client";

import { Errortracking, Product } from "@prisma/client";
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
import ImageGallery from "./imageGallery";

export const columns: ColumnDef<Errortracking>[] = [
  {
    accessorKey: "user.given_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creato da" />
    ),
  },

  {
    accessorKey: "created_at",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Creato il" />
    ),
    cell: ({ row }) => {
      const { created_at } = row.original;

      // Check if website includes the protocol, if not, prepend it.
      const formattedDate = created_at.toLocaleDateString();

      return <div suppressHydrationWarning>{formattedDate}</div>;
    },
  },
  {
    accessorKey: "error_type",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipologia" />
    ),
  },
  {
    accessorKey: "error_category",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
  },
  {
    accessorKey: "supplier.name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fornitore" />
    ),
  },
  {
    accessorKey: "position",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Posizione" />
    ),
  },
  {
    accessorKey: "description",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
  },
  {
    accessorKey: "files.image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Immagini" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const { files } = row.original;
      if (files.length === 0) return <div>N/A</div>;
      else {
        return <ImageGallery files={files} />;
      }
    },
  },

  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
