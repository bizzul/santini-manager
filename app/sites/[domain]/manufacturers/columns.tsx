"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import Image from "next/image";

// Extended Manufacturer type with manufacturer_category
type ManufacturerWithAction = {
  id: number;
  name: string;
  short_name?: string | null;
  description?: string | null;
  manufacturer_category_id?: number | null;
  manufacturer_category?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  address?: string | null;
  cap?: number | null;
  location?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  contact?: string | null;
  manufacturer_image?: string | null;
};

export const columns: ColumnDef<ManufacturerWithAction>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: "short_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Abbreviato" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
  },
  {
    accessorKey: "manufacturer_category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) => {
      const category = row.original.manufacturer_category;
      if (!category) return "-";
      return (
        <span>
          {category.code && `[${category.code}] `}
          {category.name}
        </span>
      );
    },
  },
  {
    accessorKey: "address",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Indirizzo" />
    ),
  },
  {
    accessorKey: "cap",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cap." />
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
  },
  {
    accessorKey: "website",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Website" />
    ),
    cell: ({ row }) => {
      const { website } = row.original;
      if (!website) return "-";

      const formattedWebsite =
        website.startsWith("http://") || website.startsWith("https://")
          ? website
          : `http://${website}`;

      return (
        <a href={formattedWebsite} target="_blank" rel="noopener noreferrer">
          {website}
        </a>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      const { email } = row.original;
      if (!email) return "-";
      return <a href={`mailto:${email}`}>{email}</a>;
    },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Telefono" />
    ),
  },
  {
    accessorKey: "contact",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contatto" />
    ),
  },
  {
    accessorKey: "manufacturer_image",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Logo" />
    ),
    cell: ({ row }) => {
      const image = row.original.manufacturer_image;
      return image ? (
        <Image src={image} alt={image} width={40} height={40} />
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
