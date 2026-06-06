"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";
import type { SellCategoryTableRow } from "@/types/sell-product-category-cards";
import { SellCategoryImageCell } from "@/components/sell-categories/sell-category-image-cell";
import {
  formatCategoryPieces,
  formatCategoryValue,
} from "@/lib/category-display";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const createProductCategoryEditHandler = () => {
  return async (
    rowData: SellCategoryTableRow,
    field: string,
    newValue: string | number | boolean | null,
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Errore durante il salvataggio";
      return { error: message };
    }
  };
};

export const createColumns = (
  domain?: string,
  options?: { canManageImages?: boolean; managementMode?: boolean },
): ColumnDef<SellCategoryTableRow>[] => {
  const canManageImages = options?.canManageImages ?? false;
  const managementMode = options?.managementMode ?? true;
  const handleCategoryEdit = createProductCategoryEditHandler();

  return [
    ...(managementMode
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
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
          } as ColumnDef<SellCategoryTableRow>,
        ]
      : []),
    {
      id: "image",
      header: "Immagine",
      enableSorting: false,
      cell: ({ row }) => (
        <SellCategoryImageCell
          domain={domain ?? ""}
          categoryId={row.original.id}
          categoryName={row.original.name}
          imageUrl={row.original.image_url}
          canManageImages={canManageImages}
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
        const color = row.original.color || "#3B82F6";
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded border"
              style={{ backgroundColor: color }}
            />
            <EditableCell
              value={color}
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
      accessorKey: "itemCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Articoli" />
      ),
      cell: ({ row }) => row.original.itemCount,
    },
    {
      accessorKey: "subcategoryCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sottocat." />
      ),
      cell: ({ row }) =>
        row.original.itemCount === 0 && row.original.subcategoryCount === 0
          ? "—"
          : row.original.subcategoryCount,
    },
    {
      accessorKey: "pieces",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pezzi" />
      ),
      cell: ({ row }) => formatCategoryPieces(row.original.pieces),
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valore" />
      ),
      cell: ({ row }) => formatCategoryValue(row.original.totalValue),
    },
    ...(managementMode
      ? [
          {
            id: "actions",
            header: "Azioni",
            cell: ({ row }) => (
              <DataTableRowActions
                row={row}
                domain={domain ?? ""}
                canManageImages={canManageImages}
              />
            ),
          } as ColumnDef<SellCategoryTableRow>,
        ]
      : []),
  ];
};
