"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

// Type for the flattened inventory row (item + variant)
export type InventoryRow = {
  id: string;
  item_id: string;
  variant_id?: string;
  site_id: string;
  name: string;
  description?: string;
  item_type?: string;
  category_id?: string;
  supplier_id?: string;
  category?: {
    id: string;
    name: string;
    code?: string;
  };
  supplier?: {
    id: string;
    name: string;
    code?: string;
  };
  is_stocked: boolean;
  is_consumable: boolean;
  is_active: boolean;
  // Variant fields
  internal_code?: string;
  supplier_code?: string;
  producer?: string;
  producer_code?: string;
  unit_id?: string;
  unit?: {
    id: string;
    code: string;
    name: string;
  };
  purchase_unit_price?: number;
  sell_unit_price?: number;
  attributes?: Record<string, any>;
  image_url?: string;
  url_tds?: string;
  warehouse_number?: string;
  // Flattened attributes
  color?: string;
  color_code?: string;
  width?: number;
  height?: number;
  length?: number;
  thickness?: number;
  diameter?: number;
  subcategory?: string;
  subcategory_code?: string;
  subcategory2?: string;
  subcategory2_code?: string;
  // Stock
  stock_quantity: number;
  quantity: number; // Alias for compatibility
  // Legacy compatibility
  unit_price?: number;
  sell_price?: number;
  total_price?: number;
  created_at?: string;
  updated_at?: string;
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

// Handler for inline editing inventory items
const handleInventoryEdit = async (
  rowData: InventoryRow,
  field: string,
  newValue: string | number | boolean | null
): Promise<{ success?: boolean; error?: string }> => {
  const formData = { [field]: newValue };
  const itemId = rowData.item_id || rowData.id;
  const variantId = rowData.variant_id;

  try {
    const result = await editItem(formData, itemId, variantId);
    if (result?.error) {
      return { error: result.error };
    }
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Errore durante il salvataggio" };
  }
};

export const createColumns = (domain?: string): ColumnDef<InventoryRow>[] => [
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
    accessorKey: "internal_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cod. Interno" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.internal_code}
        row={row}
        field="internal_code"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) => {
      const cat = row.original.category;
      if (cat) {
        return cat.code ? `[${cat.code}] ${cat.name}` : cat.name;
      }
      // Fallback to attributes
      const attrs = row.original.attributes || {};
      return attrs.category || "-";
    },
    filterFn: (row, id, value): boolean => {
      const cat = row.original.category;
      if (!value) return true;
      if (!cat) return false;
      return (
        cat.id === value ||
        cat.name?.toLowerCase().includes(value.toLowerCase()) ||
        false
      );
    },
  },
  {
    accessorKey: "subcategory",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sottocategoria" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.subcategory}
        row={row}
        field="subcategory"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    accessorKey: "subcategory2",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.subcategory2}
        row={row}
        field="subcategory2"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.name}
        row={row}
        field="name"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    accessorKey: "color",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Colore" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.color}
        row={row}
        field="color"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    accessorKey: "warehouse_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nr. Mag." />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.warehouse_number}
        row={row}
        field="warehouse_number"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    accessorKey: "supplier",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fornitore" />
    ),
    cell: ({ row }) => {
      const supplier = row.original.supplier;
      return supplier?.name || "-";
    },
    filterFn: (row, id, value): boolean => {
      const supplier = row.original.supplier;
      if (!value) return true;
      if (!supplier) return false;
      return (
        supplier.id === value ||
        supplier.name?.toLowerCase().includes(value.toLowerCase()) ||
        false
      );
    },
  },
  {
    accessorKey: "producer",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Produttore" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.producer}
        row={row}
        field="producer"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
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
      const qty = row.original.stock_quantity ?? row.original.quantity;
      const unit = row.original.unit;
      if (qty != null) {
        return unit ? `${qty} ${unit.code}` : qty.toString();
      }
      return "-";
    },
  },
  {
    accessorKey: "purchase_unit_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P. Acquisto" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.purchase_unit_price ?? row.original.unit_price}
        row={row}
        field="purchase_unit_price"
        type="number"
        onSave={handleInventoryEdit}
        suffix="CHF"
        formatter={(v) => v?.toFixed(2)}
      />
    ),
  },
  {
    accessorKey: "sell_unit_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P. Vendita" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.sell_unit_price ?? row.original.sell_price}
        row={row}
        field="sell_unit_price"
        type="number"
        onSave={handleInventoryEdit}
        suffix="CHF"
        formatter={(v) => v?.toFixed(2)}
      />
    ),
  },
  {
    accessorKey: "total_price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Totale" />
    ),
    cell: ({ row }) => {
      const unitPrice =
        row.original.purchase_unit_price ?? row.original.unit_price ?? 0;
      const qty = row.original.stock_quantity ?? row.original.quantity ?? 0;
      const total = unitPrice * qty;
      return total > 0 ? `${total.toFixed(2)} CHF` : "-";
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrizione" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.description}
        row={row}
        field="description"
        type="text"
        onSave={handleInventoryEdit}
      />
    ),
  },
  {
    id: "actions",
    header: "Azioni",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
  {
    accessorKey: "lastAction.createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Modifica" />
    ),
    size: 100,
    cell: ({ row }) => {
      const lastAction = row.original.lastAction;
      if (!lastAction?.createdAt) {
        // Fallback to updated_at
        const updatedAt = row.original.updated_at;
        if (updatedAt) {
          const date = new Date(updatedAt);
          const timeAgo = formatDistanceToNow(date, {
            addSuffix: true,
            locale: it,
          });
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>
          );
        }
        return "-";
      }

      const date = new Date(lastAction.createdAt);
      const timeAgo = formatDistanceToNow(date, {
        addSuffix: true,
        locale: it,
      });
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
              <span className="text-xs text-muted-foreground cursor-help whitespace-nowrap">
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
      <DataTableColumnHeader column={column} title="Da" />
    ),
    size: 60,
    cell: ({ row }) => {
      const lastAction = row.original.lastAction;
      const user = lastAction?.User;

      if (!user) return "-";

      const displayName =
        user.given_name && user.family_name
          ? `${user.given_name} ${user.family_name}`
          : user.given_name || "Utente";

      const initials =
        user.initials ||
        (user.given_name && user.family_name
          ? `${user.given_name.charAt(0)}${user.family_name.charAt(0)}`
          : user.given_name?.charAt(0) || "U");

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 cursor-help">
                <span className="text-xs font-medium text-primary">
                  {initials}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{displayName}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];

// Legacy export for backward compatibility
export const columns = createColumns();
