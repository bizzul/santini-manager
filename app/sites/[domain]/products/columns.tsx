"use client";

import { SellProduct } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Image, ExternalLink } from "lucide-react";
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
import { EditableCell } from "@/components/table/editable-cell";
import { editSellProductAction } from "./actions/edit-item.action";

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

// Handler for inline editing products
const createProductEditHandler = (domain?: string) => {
  return async (
    rowData: SellProductWithAction,
    field: string,
    newValue: string | number | boolean | null
  ): Promise<{ success?: boolean; error?: string }> => {
    // Build form data with all current values plus the changed field
    const formData = {
      name: rowData.name,
      type: rowData.type,
      description: rowData.description,
      price_list: rowData.price_list,
      image_url: rowData.image_url,
      doc_url: rowData.doc_url,
      active: rowData.active,
      category: rowData.category?.name,
      [field]: newValue,
    };

    try {
      const result = await editSellProductAction(formData, rowData.id, domain);
      if (result?.error) {
        return { error: result.error };
      }
      return { success: true };
    } catch (error: any) {
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

export const createColumns = (
  domain?: string
): ColumnDef<SellProductWithAction>[] => {
  const handleProductEdit = createProductEditHandler(domain);

  return [
    {
      id: "select",
      header: ({ table }) => {
        // Helper to find all scrollable ancestors and save their scroll positions
        const saveScrollPositions = (
          element: HTMLElement | null
        ): Array<{ el: HTMLElement; scrollTop: number }> => {
          const positions: Array<{ el: HTMLElement; scrollTop: number }> = [];
          let current = element;
          while (current) {
            const { overflow, overflowY } = window.getComputedStyle(current);
            if (
              overflow === "auto" ||
              overflow === "scroll" ||
              overflowY === "auto" ||
              overflowY === "scroll"
            ) {
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

              const scrollPositions = saveScrollPositions(
                e.currentTarget as HTMLElement
              );
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
        const saveScrollPositions = (
          element: HTMLElement | null
        ): Array<{ el: HTMLElement; scrollTop: number }> => {
          const positions: Array<{ el: HTMLElement; scrollTop: number }> = [];
          let current = element;
          while (current) {
            const { overflow, overflowY } = window.getComputedStyle(current);
            if (
              overflow === "auto" ||
              overflow === "scroll" ||
              overflowY === "auto" ||
              overflowY === "scroll"
            ) {
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
              const scrollPositions = saveScrollPositions(
                e.currentTarget as HTMLElement
              );
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
      cell: ({ row }) => (
        <EditableCell
          value={row.original.name}
          row={row}
          field="name"
          type="text"
          onSave={handleProductEdit}
        />
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sottocategoria" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.type}
          row={row}
          field="type"
          type="text"
          onSave={handleProductEdit}
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
          onSave={handleProductEdit}
          className="max-w-[300px]"
        />
      ),
    },
    {
      accessorKey: "price_list",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Listino Prezzi" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.price_list}
          row={row}
          field="price_list"
          type="checkbox"
          onSave={handleProductEdit}
        />
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
        <EditableCell
          value={row.original.active}
          row={row}
          field="active"
          type="checkbox"
          onSave={handleProductEdit}
        />
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
};
