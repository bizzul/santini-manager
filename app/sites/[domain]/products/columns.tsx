"use client";

import { SellProduct } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Check, X, Image, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <DataTableColumnHeader column={column} title="Sottocategoria" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate" title={row.original.description || ""}>
        {row.original.description || "-"}
      </div>
    ),
  },
  {
    accessorKey: "price_list",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listino Prezzi" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-start">
        {row.original.price_list ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    ),
    size: 100,
  },
  {
    accessorKey: "image_url",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Immagine" />
    ),
    cell: ({ row }) => {
      const imageUrl = row.original.image_url;
      if (!imageUrl) return <span className="text-muted-foreground">-</span>;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => window.open(imageUrl, "_blank")}
        >
          <Image className="h-4 w-4" />
        </Button>
      );
    },
    size: 80,
  },
  {
    accessorKey: "doc_url",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="DOC" />
    ),
    cell: ({ row }) => {
      const docUrl = row.original.doc_url;
      if (!docUrl) return <span className="text-muted-foreground">-</span>;
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => window.open(docUrl, "_blank")}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      );
    },
    size: 80,
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} domain={domain} />,
  },
];
