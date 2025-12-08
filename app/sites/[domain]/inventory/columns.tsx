"use client";

import { Product } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

// Extended Product type with lastAction
type ProductWithAction = Product & {
  lastAction?: {
    createdAt: string;
    type: string;
    User?: {
      given_name: string | null;
      family_name: string | null;
      picture: string | null;
      initials: string | null;
    };
  } | null;
};

export const columns: ColumnDef<ProductWithAction>[] = [
  {
    accessorKey: "internal_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cod. Interno" />
    ),
    cell: ({ row }) => {
      const code = row.original.internal_code;
      return code || "-";
    },
  },
  {
    accessorKey: "inventoryId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) => {
      const cat = row.original.category;
      return cat || "-";
    },
  },
  {
    accessorKey: "subcategory",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sottocategoria" />
    ),
    cell: ({ row }) => {
      const subcat = row.original.subcategory;
      return subcat || "-";
    },
  },
  {
    accessorKey: "subcategory2",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => {
      const subcat2 = row.original.subcategory2;
      return subcat2 || "-";
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
  },
  {
    accessorKey: "color",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Colore" />
    ),
    cell: ({ row }) => {
      const color = row.original.color;
      const colorCode = row.original.color_code;
      if (color && colorCode && color !== colorCode) {
        return `${color} (${colorCode})`;
      }
      return color || colorCode || "-";
    },
  },
  {
    accessorKey: "warehouse_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nr. Mag." />
    ),
    cell: ({ row }) => {
      const wh = row.original.warehouse_number;
      return wh || "-";
    },
  },
  {
    accessorKey: "supplier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fornitore" />
    ),
    cell: ({ row }) => {
      // @ts-ignore - supplierInfo may come from join
      const supplierInfo = row.original.supplierInfo;
      const supplier = row.original.supplier;
      return supplierInfo?.name || supplier || "-";
    },
  },
  {
    accessorKey: "producer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Produttore" />
    ),
    cell: ({ row }) => {
      const producer = row.original.producer;
      return producer || "-";
    },
  },
  {
    accessorKey: "dimensions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Misure (LxAxP)" />
    ),
    cell: ({ row }) => {
      const { width, height, length, thickness, diameter } = row.original;
      const parts: string[] = [];
      
      if (width || height || length) {
        parts.push(`${width || 0}x${height || 0}x${length || 0}`);
      }
      if (thickness) {
        parts.push(`sp.${thickness}`);
      }
      if (diameter) {
        parts.push(`ø${diameter}`);
      }
      
      return parts.length > 0 ? parts.join(" ") : "-";
    },
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Qta." />
    ),
    cell: ({ row }) => {
      const qty = row.original.quantity;
      const unit = row.original.unit;
      if (qty != null) {
        return unit ? `${qty} ${unit}` : qty;
      }
      return "-";
    },
  },
  {
    accessorKey: "unit_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P. Acquisto" />
    ),
    cell: ({ row }) => {
      const price = row.original.unit_price;
      return price != null ? `${price.toFixed(2)} CHF` : "-";
    },
  },
  {
    accessorKey: "sell_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P. Vendita" />
    ),
    cell: ({ row }) => {
      const price = row.original.sell_price;
      return price != null ? `${price.toFixed(2)} CHF` : "-";
    },
  },
  {
    accessorKey: "total_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Totale" />
    ),
    cell: ({ row }) => {
      const price = row.original.total_price;
      return price != null ? `${price.toFixed(2)} CHF` : "-";
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
    cell: ({ row }) => {
      const desc = row.original.description;
      return desc || "-";
    },
  },
  {
    accessorKey: "lastAction.createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ultima modifica" />
    ),
    cell: ({ row }) => {
      const lastAction = row.original.lastAction;
      if (!lastAction?.createdAt) return "-";

      const date = new Date(lastAction.createdAt);
      const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: it });
      const fullDate = date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-muted-foreground cursor-help">
                {timeAgo}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{fullDate}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "lastAction.User",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modificato da" />
    ),
    cell: ({ row }) => {
      const lastAction = row.original.lastAction;
      const user = lastAction?.User;
      
      if (!user) return "-";

      const displayName = user.given_name && user.family_name
        ? `${user.given_name} ${user.family_name}`
        : user.given_name || "Utente";

      // Generate initials from name
      const initials = user.initials || 
        (user.given_name && user.family_name 
          ? `${user.given_name.charAt(0)}${user.family_name.charAt(0)}`
          : user.given_name?.charAt(0) || "U");

      return (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-primary">{initials}</span>
          </div>
          <span className="text-sm truncate">{displayName}</span>
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
