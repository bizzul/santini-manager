"use client";

import { SellProduct } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Check, X, Image, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

// Extended SellProduct type with lastAction
export type SellProductWithAction = SellProduct & {
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

export const createColumns = (
  domain?: string
): ColumnDef<SellProductWithAction>[] => [
  {
    id: "select",
    header: ({ table }) => {
      // Helper to find all scrollable ancestors and save their scroll positions
      const saveScrollPositions = (element: HTMLElement | null): Array<{el: HTMLElement, scrollTop: number}> => {
        const positions: Array<{el: HTMLElement, scrollTop: number}> = [];
        let current = element;
        while (current) {
          const { overflow, overflowY } = window.getComputedStyle(current);
          if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
            positions.push({ el: current, scrollTop: current.scrollTop });
          }
          current = current.parentElement;
        }
        return positions;
      };
      
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const scrollPositions = saveScrollPositions(e.currentTarget as HTMLElement);
            const windowScrollY = window.scrollY;
            
            table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected());
            
            requestAnimationFrame(() => {
              scrollPositions.forEach(({ el, scrollTop }) => {
                el.scrollTop = scrollTop;
              });
              window.scrollTo({ top: windowScrollY, behavior: "instant" });
            });
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={() => {}}
            aria-label="Seleziona tutto"
            tabIndex={-1}
          />
        </div>
      );
    },
    cell: ({ row }) => {
      // Helper to find all scrollable ancestors and save their scroll positions
      const saveScrollPositions = (element: HTMLElement | null): Array<{el: HTMLElement, scrollTop: number}> => {
        const positions: Array<{el: HTMLElement, scrollTop: number}> = [];
        let current = element;
        while (current) {
          const { overflow, overflowY } = window.getComputedStyle(current);
          if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
            positions.push({ el: current, scrollTop: current.scrollTop });
          }
          current = current.parentElement;
        }
        return positions;
      };
      
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            
            // Save scroll positions of ALL scrollable ancestors
            const scrollPositions = saveScrollPositions(e.currentTarget as HTMLElement);
            const windowScrollY = window.scrollY;
            
            row.toggleSelected(!row.getIsSelected());
            
            // Restore all scroll positions on next frame
            requestAnimationFrame(() => {
              scrollPositions.forEach(({ el, scrollTop }) => {
                el.scrollTop = scrollTop;
              });
              window.scrollTo({ top: windowScrollY, behavior: "instant" });
            });
          }}
          onMouseDown={(e) => {
            // Prevent focus shift which can cause scroll
            e.preventDefault();
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={() => {}}
            aria-label="Seleziona riga"
            tabIndex={-1}
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    id: "category",
    accessorFn: (row) => row.category?.name || "-",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Categoria" />
    ),
    cell: ({ row }) => <span>{row.original.category?.name || "-"}</span>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nome" />
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
      <div
        className="max-w-[300px] truncate"
        title={row.original.description || ""}
      >
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
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Attivo" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-start">
        {row.original.active ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <X className="h-4 w-4 text-red-500" />
        )}
      </div>
    ),
    size: 80,
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

      const displayName =
        user.given_name && user.family_name
          ? `${user.given_name} ${user.family_name}`
          : user.given_name || "Utente";

      // Generate initials from name
      const initials =
        user.initials ||
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
    cell: ({ row }) => <DataTableRowActions row={row} domain={domain} />,
  },
];
