"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { EditableCell } from "@/components/table/editable-cell";
import { editItem } from "./actions/edit-item.action";

// Project row type
type ProjectRow = {
  id: number;
  unique_code?: string | null;
  other?: string | null;
  sellPrice?: number | null;
  deliveryDate?: string | Date | null;
  archived?: boolean;
  updated_at?: string;
  Client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  SellProduct?: {
    name?: string | null;
    type?: string | null;
  } | null;
  Kanban?: {
    title?: string | null;
  } | null;
  KanbanColumn?: {
    title?: string | null;
  } | null;
  Action?: Array<{
    createdAt: string;
    User?: {
      picture?: string | null;
      given_name?: string | null;
    };
  }>;
  [key: string]: any;
};

// Handler for inline editing projects
const createProjectEditHandler = (domain?: string) => {
  return async (
    rowData: ProjectRow,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    // Build formData with all required fields
    const formData: any = {
      unique_code: rowData.unique_code,
      other: rowData.other,
      sellPrice: rowData.sellPrice,
      [field]: newValue,
    };

    try {
      const result = await editItem(formData, rowData.id, domain);
      if (result?.error || result?.message) {
        return { error: result.message || "Errore durante il salvataggio" };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

export const createColumns = (domain?: string): ColumnDef<ProjectRow>[] => {
  const handleProjectEdit = createProjectEditHandler(domain);

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
      accessorKey: "unique_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Codice" />
      ),
      size: 90,
      minSize: 60,
      maxSize: 200,
      enableResizing: true,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.unique_code}
          row={row}
          field="unique_code"
          type="text"
          onSave={handleProjectEdit}
        />
      ),
    },
    {
      accessorKey: "client",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cliente" />
      ),
      size: 140,
      minSize: 80,
      maxSize: 400,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;

        const clientName =
          rowData.Client?.businessName ||
          `${rowData.Client?.individualFirstName || ""} ${
            rowData.Client?.individualLastName || ""
          }`.trim() ||
          "N/A";
        return (
          <span className="truncate block" title={clientName}>
            {clientName}
          </span>
        );
      },
    },
    {
      accessorKey: "product",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Prodotto" />
      ),
      size: 130,
      minSize: 80,
      maxSize: 400,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        const productName = rowData.SellProduct?.name;
        const productType = rowData.SellProduct?.type;

        if (!productName) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="truncate max-w-full cursor-default"
                >
                  {productName}
                </Badge>
              </TooltipTrigger>
              {productType && (
                <TooltipContent>
                  <p>{productType}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "column",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Posizione" />
      ),
      size: 180,
      minSize: 100,
      maxSize: 400,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        const kanbanTitle = rowData.Kanban?.title || "N/A";
        const columnTitle = rowData.KanbanColumn?.title || "N/A";
        const fullPosition = `${kanbanTitle} → ${columnTitle}`;
        return (
          <span className="truncate block" title={fullPosition}>
            {fullPosition}
          </span>
        );
      },
    },
    {
      accessorKey: "other",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Note" />
      ),
      size: 150,
      minSize: 80,
      maxSize: 500,
      enableResizing: true,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.other}
          row={row}
          field="other"
          type="text"
          onSave={handleProjectEdit}
        />
      ),
    },
    {
      accessorKey: "deliveryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Consegna" />
      ),
      size: 100,
      minSize: 70,
      maxSize: 150,
      enableResizing: true,
      cell: ({ row }) => {
        const { deliveryDate } = row.original;

        let formattedDate = null;
        if (deliveryDate) {
          try {
            const dateObj =
              deliveryDate instanceof Date
                ? deliveryDate
                : new Date(deliveryDate);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              });
            }
          } catch (error) {
            console.error("Error formatting delivery date:", error);
          }
        }

        return (
          <div suppressHydrationWarning className="whitespace-nowrap">
            {formattedDate || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "sellPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valore" />
      ),
      size: 100,
      minSize: 60,
      maxSize: 150,
      enableResizing: true,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.sellPrice}
          row={row}
          field="sellPrice"
          type="number"
          onSave={handleProjectEdit}
          suffix="CHF"
        />
      ),
    },
    {
      accessorKey: "archived",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Arch." />
      ),
      size: 70,
      minSize: 50,
      maxSize: 100,
      enableResizing: true,
      cell: ({ row }) => {
        const { archived } = row.original;
        return (
          <Badge variant={archived ? "secondary" : "outline"} className="text-xs">
            {archived ? "Sì" : "No"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "actions_user",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ultima mod." />
      ),
      size: 110,
      minSize: 80,
      maxSize: 180,
      enableResizing: true,
      cell: ({ row }) => {
        const actions = row.original.Action || [];
        const updateDate = row.original.updated_at ? new Date(row.original.updated_at) : null;

        if (!Array.isArray(actions) || actions.length === 0) {
          return "-";
        }

        const mostRecentAction =
          actions.length > 0
            ? actions.sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).valueOf() -
                  new Date(a.createdAt).valueOf()
              )[0]
            : null;

        const userPicture = mostRecentAction?.User?.picture;
        const userGivenName = mostRecentAction?.User?.given_name;

        if (!mostRecentAction || !userPicture) {
          return "-";
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1.5">
                  {userPicture ? (
                    <Image
                      src={userPicture}
                      alt={userGivenName || "User"}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  )}
                  <span
                    className="text-xs whitespace-nowrap"
                    suppressHydrationWarning
                  >
                    {updateDate?.toLocaleDateString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                    }) || "-"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{userGivenName || "Unknown User"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      header: "Azioni",
      size: 70,
      minSize: 60,
      maxSize: 100,
      enableResizing: false,
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ];
};

// Legacy export for backward compatibility
export const columns = createColumns();
