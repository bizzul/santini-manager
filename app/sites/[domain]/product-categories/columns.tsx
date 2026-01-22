"use client";

import { SellProductCategory } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

// Handler for inline editing product categories
const createProductCategoryEditHandler = () => {
  return async (
    rowData: SellProductCategory,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData = {
      name: rowData.name,
      description: rowData.description,
      color: rowData.color,
      [field]: newValue,
    };

    try {
      const result = await editItem(formData, rowData.id);
      if (result?.error) {
        return { error: result.error };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

export const createColumns = (): ColumnDef<SellProductCategory>[] => {
  const handleCategoryEdit = createProductCategoryEditHandler();

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
          onSave={handleCategoryEdit}
        />
      ),
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
          onSave={handleCategoryEdit}
        />
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
            <EditableCell
              value={color || "#3B82F6"}
              row={row}
              field="color"
              type="text"
              onSave={handleCategoryEdit}
            />
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
};

// Legacy export for backward compatibility
export const columns = createColumns();
