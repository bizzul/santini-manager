"use client";

import { SellProduct } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Check, X } from "lucide-react";

export const createColumns = (domain?: string): ColumnDef<SellProduct>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
  },
  {
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Attivo" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-start">
        {row.original.active ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
      </div>
    ),
    size: 10,
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} domain={domain} />,
  },
];
