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
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: "unique_code",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Codice" />
    ),
    size: 90,
    minSize: 60,
    maxSize: 200,
    enableResizing: true,
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
    cell: ({ row }) => {
      const note = row.original.other;
      if (!note) return <span className="text-muted-foreground">-</span>;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate block cursor-default">{note}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <p>{note}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
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
    cell: ({ row }) => {
      const price = row.original.sellPrice;
      if (!price) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="whitespace-nowrap font-medium">
          {price.toLocaleString("it-IT")} CHF
        </span>
      );
    },
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
      const updateDate = new Date(row.original.updated_at);

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
                  {updateDate.toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
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
