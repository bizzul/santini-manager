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
import { 
  StickyNote, 
  Folder, 
  FileText, 
  MapPin, 
  Settings, 
  File,
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Helper function to extract CAP from address string
function extractCAP(text: string | null | undefined): number | null {
  if (!text) return null;
  // Try to find a 4-5 digit number (Swiss CAP format)
  const capMatch = text.match(/\b\d{4,5}\b/);
  return capMatch ? parseInt(capMatch[0], 10) : null;
}

// Project row type
type ProjectRow = {
  id: number;
  unique_code?: string | null;
  title?: string | null;
  name?: string | null;
  other?: string | null;
  luogo?: string | null;
  sellPrice?: number | null;
  deliveryDate?: string | Date | null;
  archived?: boolean;
  updated_at?: string;
  cloud_folder_url?: string | null;
  project_files_url?: string | null;
  Client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
    zipCode?: number | null;
    address?: string | null;
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

export const createColumns = (domain?: string): ColumnDef<ProjectRow>[] => {
  const handleProjectEdit = createProjectEditHandler(domain);

  return [
    {
      id: "select",
      header: ({ table }) => (
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
            aria-label="Seleziona tutti"
            tabIndex={-1}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            const scrollPositions = saveScrollPositions(
              e.currentTarget as HTMLElement
            );
            const windowScrollY = window.scrollY;

            row.toggleSelected(!row.getIsSelected());

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
            checked={row.getIsSelected()}
            onCheckedChange={() => {}}
            aria-label="Seleziona riga"
            tabIndex={-1}
          />
        </div>
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
      accessorKey: "nome_oggetto",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome oggetto" />
      ),
      size: 180,
      minSize: 100,
      maxSize: 400,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        const nomeOggetto = rowData.title || rowData.name || "-";
        return (
          <span className="truncate block" title={nomeOggetto}>
            {nomeOggetto}
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
      accessorKey: "luogo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Luogo" />
      ),
      size: 80,
      minSize: 60,
      maxSize: 120,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        // Extract CAP from Client zipCode or from luogo field
        const cap = rowData.Client?.zipCode || 
                   (rowData.luogo ? extractCAP(rowData.luogo) : null);
        return (
          <span className="truncate block" title={cap?.toString() || "-"}>
            {cap || "-"}
          </span>
        );
      },
    },
    {
      id: "notes_icon",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <StickyNote className="h-4 w-4" />
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const hasNotes = !!row.original.other && row.original.other.trim() !== "";
        return (
          <div className="flex items-center justify-center w-full h-full">
            {hasNotes ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-6 h-6 flex items-center justify-center">
                      <StickyNote className="h-4 w-4 text-primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{row.original.other}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="w-6 h-6 border border-muted-foreground/20 rounded" />
            )}
          </div>
        );
      },
    },
    {
      id: "cloud_folder",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <Folder className="h-4 w-4" />
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const folderUrl = row.original.cloud_folder_url;
        return (
          <div className="flex items-center justify-center w-full h-full">
            {folderUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => window.open(folderUrl, "_blank")}
              >
                <Folder className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <div className="w-6 h-6 border border-muted-foreground/20 rounded" />
            )}
          </div>
        );
      },
    },
    {
      id: "reports",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <FileText className="h-4 w-4" />
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const projectId = row.original.id;
        const currentDomain = domain || window.location.pathname.split('/')[2];
        return (
          <div className="flex items-center justify-center w-full h-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      // Navigate to reports page for this project
                      window.location.href = `/sites/${currentDomain}/projects/${projectId}/reports`;
                    }}
                  >
                    <FileText className="h-4 w-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rapporti, bollettini, protocolli di collaudo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      id: "google_maps",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <MapPin className="h-4 w-4" />
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const address = row.original.Client?.address || row.original.luogo;
        const googleMapsUrl = address 
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
          : null;
        return (
          <div className="flex items-center justify-center w-full h-full">
            {googleMapsUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => window.open(googleMapsUrl, "_blank")}
              >
                <MapPin className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <div className="w-6 h-6 border border-muted-foreground/20 rounded" />
            )}
          </div>
        );
      },
    },
    {
      id: "consuntivo",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <Settings className="h-4 w-4" />
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const projectId = row.original.id;
        const currentDomain = domain || window.location.pathname.split('/')[2];
        return (
          <div className="flex items-center justify-center w-full h-full">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      // Navigate to project dashboard/consuntivo
                      window.location.href = `/sites/${currentDomain}/projects/${projectId}/consuntivo`;
                    }}
                  >
                    <Settings className="h-4 w-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dashboard consuntivo progetto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      id: "project_files",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <File className="h-4 w-4" />
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => {
        const filesUrl = row.original.project_files_url;
        const projectId = row.original.id;
        return (
          <div className="flex items-center justify-center w-full h-full">
            {filesUrl ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => window.open(filesUrl, "_blank")}
              >
                <File className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <div className="w-6 h-6 border border-muted-foreground/20 rounded" />
            )}
          </div>
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
