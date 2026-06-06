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
import {
  EditableSelectCell,
  SelectOption,
} from "@/components/table/editable-select-cell";
import {
  editItem,
  setStockQuantity,
} from "./actions/edit-item.action";
import { InventorySupplier } from "@/types/supabase";

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
  newValue: string | number | boolean | Date | null
): Promise<{ success?: boolean; error?: string }> => {
  if (field === "quantity") {
    if (!rowData.variant_id) {
      return { error: "Variante non trovata" };
    }

    if (typeof newValue !== "number" || !Number.isFinite(newValue)) {
      return { error: "Inserisci una quantità valida" };
    }

    return setStockQuantity(rowData.variant_id, newValue);
  }

  const dimensionFields = new Set([
    "width",
    "height",
    "length",
    "thickness",
    "diameter",
  ]);

  if (
    dimensionFields.has(field) &&
    typeof newValue === "number" &&
    newValue < 0
  ) {
    return { error: "Le dimensioni devono essere maggiori o uguali a 0" };
  }

  const valueToSave =
    field === "supplier_id" && newValue === "__none__" ? null : newValue;
  const formData = { [field]: valueToSave };
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

const EMPTY_SUPPLIER_VALUE = "__none__";

function getCategoryCode(row: InventoryRow) {
  const attrs = row.attributes || {};
  const code =
    row.category?.code ||
    attrs.category_code ||
    (typeof row.category?.name === "string"
      ? row.category.name.slice(0, 3)
      : null) ||
    (typeof attrs.category === "string" ? attrs.category.slice(0, 3) : null);

  return code ? String(code).slice(0, 3).toUpperCase() : "-";
}

export const createColumns = (
  domain?: string,
  suppliers: InventorySupplier[] = [],
  options: { subcategoryColumnTitle?: string } = {},
): ColumnDef<InventoryRow>[] => {
  const subcategoryColumnTitle =
    options.subcategoryColumnTitle ?? "Sottocategoria";
  const supplierOptions: SelectOption[] = [
    { value: EMPTY_SUPPLIER_VALUE, label: "Nessun fornitore" },
    ...suppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
    })),
  ];

  return [
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
    cell: ({ row }) => getCategoryCode(row.original),
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
      <DataTableColumnHeader
        column={column}
        title={subcategoryColumnTitle}
      />
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
    cell: ({ row }) => (
      <EditableSelectCell
        value={row.original.supplier_id ?? EMPTY_SUPPLIER_VALUE}
        displayValue={row.original.supplier?.name}
        row={row}
        field="supplier_id"
        options={supplierOptions}
        onSave={handleInventoryEdit}
        placeholder="Nessun fornitore"
        emptyMessage="Nessun fornitore trovato."
      />
    ),
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
    accessorKey: "width",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Larg." />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.width}
        row={row}
        field="width"
        type="number"
        min={0}
        max={9999}
        step={0.01}
        onSave={handleInventoryEdit}
        className="min-w-0 justify-center pr-4 text-center"
      />
    ),
  },
  {
    accessorKey: "height",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Alt." />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.height}
        row={row}
        field="height"
        type="number"
        min={0}
        max={9999}
        step={0.01}
        onSave={handleInventoryEdit}
        className="min-w-0 justify-center pr-4 text-center"
      />
    ),
  },
  {
    accessorKey: "length",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Lung." />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.length}
        row={row}
        field="length"
        type="number"
        min={0}
        max={9999}
        step={0.01}
        onSave={handleInventoryEdit}
        className="min-w-0 justify-center pr-4 text-center"
      />
    ),
  },
  {
    accessorKey: "thickness",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sp." />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.thickness}
        row={row}
        field="thickness"
        type="number"
        min={0}
        max={9999}
        step={0.01}
        onSave={handleInventoryEdit}
        className="min-w-0 justify-center pr-4 text-center"
      />
    ),
  },
  {
    accessorKey: "diameter",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ø" />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.diameter}
        row={row}
        field="diameter"
        type="number"
        min={0}
        max={9999}
        step={0.01}
        onSave={handleInventoryEdit}
        className="min-w-0 justify-center pr-4 text-center"
      />
    ),
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Pz." />
    ),
    cell: ({ row }) => (
      <EditableCell
        value={row.original.stock_quantity ?? row.original.quantity}
        row={row}
        field="quantity"
        type="number"
        min={0}
        step={0.01}
        onSave={handleInventoryEdit}
        suffix={row.original.unit?.code}
        className="min-w-0 justify-center pr-4 text-center"
      />
    ),
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
        className="min-w-0 justify-center pr-4 text-center"
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
    id: "last_modified",
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
    id: "last_modified_by",
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
};

// Legacy export for backward compatibility
export const columns = createColumns();
