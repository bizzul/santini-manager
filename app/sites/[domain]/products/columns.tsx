"use client";

import { SellProduct } from "@/types/supabase";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { Image, ExternalLink, FileText, Download } from "lucide-react";
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

              table.toggleAllPageRowsSelected(
                !table.getIsAllPageRowsSelected()
              );

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
      accessorKey: "internal_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cod." />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.internal_code || ""}
          row={row}
          field="internal_code"
          type="text"
          onSave={handleProductEdit}
        />
      ),
      size: 40,
    },
    {
      id: "category",
      accessorFn: (row) => row.category?.name || "-",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => <span>{row.original.category?.name || "-"}</span>,
      size: 130,
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sottocategoria" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.type || ""}
          row={row}
          field="type"
          type="text"
          onSave={handleProductEdit}
        />
      ),
      size: 140,
    },
    {
      accessorKey: "type",
      id: "product_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tipo" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.type || ""}
          row={row}
          field="type"
          type="text"
          onSave={handleProductEdit}
        />
      ),
      size: 150,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome" />
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original.name || ""}
          row={row}
          field="name"
          type="text"
          onSave={handleProductEdit}
        />
      ),
      size: 200,
    },
    {
      accessorKey: "color",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Colore" />
      ),
      cell: ({ row }) => {
        // Color field doesn't exist in SellProduct yet, showing placeholder
        return <span className="text-muted-foreground">-</span>;
      },
      size: 100,
    },
    {
      accessorKey: "supplier",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fornitore" />
      ),
      cell: ({ row }) => {
        // Supplier field doesn't exist in SellProduct yet, showing placeholder
        return <span className="text-muted-foreground">-</span>;
      },
      size: 150,
    },
    {
      accessorKey: "doc_url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scheda" />
      ),
      cell: ({ row }) => {
        const docUrl = row.original.doc_url;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => docUrl && window.open(docUrl, "_blank")}
                  disabled={!docUrl}
                >
                  <FileText
                    className={`h-4 w-4 ${docUrl ? "text-blue-600 hover:text-blue-700" : "text-muted-foreground"}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {docUrl
                    ? "Apri scheda tecnica / cartella"
                    : "Nessuna scheda tecnica disponibile"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      size: 120,
    },
    {
      id: "actions",
      header: "Azioni",
      cell: ({ row }) => <DataTableRowActions row={row} domain={domain} />,
    },
    {
      id: "last_modified",
      accessorFn: (row) => row.lastAction?.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ultima modifica" />
      ),
      cell: ({ row }) => {
        const createdAt = row.original.lastAction?.createdAt;
        if (!createdAt) return <span className="text-muted-foreground">-</span>;
        return (
          <span suppressHydrationWarning>
            {formatDistanceToNow(new Date(createdAt), {
              addSuffix: true,
              locale: it,
            })}
          </span>
        );
      },
      size: 120,
    },
    {
      id: "modified_by",
      accessorFn: (row) =>
        row.lastAction?.User?.given_name || row.lastAction?.User?.family_name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Modificato da" />
      ),
      cell: ({ row }) => {
        const user = row.original.lastAction?.User;
        if (!user) return <span className="text-muted-foreground">-</span>;
        const name = [user.given_name, user.family_name].filter(Boolean).join(" ");
        return name || "-";
      },
      size: 120,
    },
  ];
};
