"use client";

import { SellProductCategory } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Checkbox } from "@/components/ui/checkbox";

export const columns: ColumnDef<SellProductCategory>[] = [
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
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
  },
  {
    accessorKey: "color",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Colore" />
    ),
    cell: ({ row }) => {
      const color = row.getValue("color") as string;
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border"
            style={{ backgroundColor: color || "#3B82F6" }}
          />
          <span>{color || "#3B82F6"}</span>
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
