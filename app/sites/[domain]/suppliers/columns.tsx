"use client";

import { Product, Supplier } from "@prisma/client";
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
import Link from "next/link";
export const columns: ColumnDef<Supplier>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: "short_name",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Abbreviato" />
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
    accessorKey: "category",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
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
    accessorKey: "cap",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cap." />
    ),
  },
  {
    accessorKey: "location",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
  },
  {
    accessorKey: "website",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Website" />
    ),
    cell: ({ row }) => {
      const { website } = row.original;

      // Check if website includes the protocol, if not, prepend it.
      const formattedWebsite =
        website!.startsWith("http://") || website!.startsWith("https://")
          ? website
          : `http://${website}`;

      return (
        // Use a standard anchor tag for external URLs
        <a href={formattedWebsite!} target="_blank" rel="noopener noreferrer">
          {website}
        </a>
      );
    },
  },
  {
    accessorKey: "email",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const { email } = row.original;
      return <a href={`mailto:${email}`}>{email}</a>;
    },
  },
  {
    accessorKey: "phone",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefono" />
    ),
  },
  {
    accessorKey: "contact",
    // header: "Tipo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contatto" />
    ),
  },
  {
    accessorKey: "supplier_image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Logo" />
    ),
    cell: ({ row }) => {
      //@ts-ignore
      const image = row.original.supplier_image;
      return image ? (
        <Image src={image!} alt={image!} width={40} height={40} />
      ) : (
        "N/A"
      );
    },
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
