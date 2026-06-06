"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";
import type { CategoryTableRow } from "@/types/category-cards";
import { CategoryImageCell } from "@/components/categories/category-image-cell";
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

const createCategoryEditHandler = (domain?: string) => {
  return async (
    rowData: CategoryTableRow,
    field: string,
    newValue: string | number | boolean | null,
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData = {
      name: rowData.name,
      code: rowData.code,
      description: rowData.description,
      [field]: newValue,
    };

    try {
      const result = await editItem(formData, rowData.id, domain);
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
): ColumnDef<CategoryTableRow>[] => {
  const canManageImages = options?.canManageImages ?? false;
  const managementMode = options?.managementMode ?? true;
  const handleCategoryEdit = createCategoryEditHandler(domain);

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
          } as ColumnDef<CategoryTableRow>,
        ]
      : []),
    {
      id: "image",
      header: "Immagine",
      enableSorting: false,
      cell: ({ row }) => (
        <CategoryImageCell
          domain={domain ?? ""}
          categoryId={row.original.id}
          categoryName={row.original.name}
          imageUrl={row.original.image_url}
          canManageImages={canManageImages}
        />
      ),
    },
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Codice" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.code}
          row={row}
          field="code"
          type="text"
          onSave={handleCategoryEdit}
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
      cell: ({ row }) => {
        const description = row.original.description ?? "";
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[200px] truncate">
                  <EditableCell
                    value={description}
                    row={row}
                    field="description"
                    type="text"
                    onSave={handleCategoryEdit}
                  />
                </div>
              </TooltipTrigger>
              {description.length > 0 && (
                <TooltipContent>
                  <p className="max-w-xs">{description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "itemCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Articoli" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.original.itemCount}
        </span>
      ),
    },
    {
      accessorKey: "subcategoryCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sottocat." />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.original.itemCount === 0 && row.original.subcategoryCount === 0
            ? "—"
            : row.original.subcategoryCount}
        </span>
      ),
    },
    {
      accessorKey: "pieces",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Pezzi" />
      ),
      cell: ({ row }) => (
        <span className="block text-right text-muted-foreground tabular-nums">
          {formatCategoryPieces(row.original.pieces)}
        </span>
      ),
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valore" />
      ),
      cell: ({ row }) => (
        <span className="block text-right text-muted-foreground tabular-nums">
          {formatCategoryValue(row.original.totalValue)}
        </span>
      ),
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
          } as ColumnDef<CategoryTableRow>,
        ]
      : []),
  ];
};

export const columns = createColumns();
