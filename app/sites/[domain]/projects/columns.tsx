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
import Link from "next/link";
import { EditableCell } from "@/components/table/editable-cell";
import { EditableSelectCell, SelectOption } from "@/components/table/editable-select-cell";
import { EditableDateCell } from "@/components/table/editable-date-cell";
import { EditableNotesCell } from "@/components/table/editable-notes-cell";
import { editItem } from "./actions/edit-item.action";
import {
  Folder,
  FileText,
  MapPin,
  Settings,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isWeekend } from "@/lib/utils";

function extractCAP(text: string | null | undefined): number | null {
  if (!text) return null;
  const capMatch = text.match(/\b\d{4,5}\b/);
  return capMatch ? parseInt(capMatch[0], 10) : null;
}

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
  clientId?: number | null;
  sellProductId?: number | null;
  kanbanId?: number | null;
  kanbanColumnId?: number | null;
  Client?: {
    id?: number;
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
    zipCode?: number | null;
    address?: string | null;
    city?: string | null;
  } | null;
  SellProduct?: {
    id?: number;
    name?: string | null;
    type?: string | null;
  } | null;
  Kanban?: {
    id?: number;
    title?: string | null;
  } | null;
  KanbanColumn?: {
    id?: number;
    title?: string | null;
  } | null;
  Action?: Array<{
    createdAt: string;
    User?: {
      picture?: string | null;
      given_name?: string | null;
    };
  }>;
  fileCount?: number;
  [key: string]: any;
};

const createProjectEditHandler = (domain?: string) => {
  return async (
    rowData: ProjectRow,
    field: string,
    newValue: string | number | boolean | Date | null
  ): Promise<{ success?: boolean; error?: string }> => {
    const formData: any = {
      unique_code: rowData.unique_code || undefined,
      other: rowData.other || undefined,
      sellPrice: rowData.sellPrice ?? 0,
      productId: rowData.sellProductId ?? rowData.SellProduct?.id ?? null,
      kanbanId: rowData.kanbanId ?? rowData.Kanban?.id,
      kanbanColumnId: rowData.kanbanColumnId ?? rowData.KanbanColumn?.id,
      clientId: rowData.clientId ?? rowData.Client?.id,
      name: (rowData.name ?? rowData.title) || undefined,
      luogo: rowData.luogo || undefined,
      deliveryDate: rowData.deliveryDate ?? undefined,
      [field]: newValue,
    };

    // When changing kanban, reset column so server assigns the first one
    if (field === "kanbanId") {
      formData.kanbanColumnId = null;
    }

    try {
      const result = await editItem(formData, rowData.id, domain);
      if (result?.error || result?.message) {
        return { error: result.message || "Errore durante il salvataggio" };
      }
      return { success: true };
    } catch (error: any) {
      console.error("Inline edit error:", error);
      return { error: error.message || "Errore durante il salvataggio" };
    }
  };
};

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

// --- Column configuration ---

type ColumnsConfig = {
  domain?: string;
  clients?: Array<{
    id: number;
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  }>;
  products?: Array<{
    id: number;
    name?: string | null;
    type?: string | null;
  }>;
  kanbans?: Array<{
    id: number;
    title?: string | null;
  }>;
};

function getClientLabel(c: {
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
}): string {
  return (
    c.businessName ||
    `${c.individualLastName || ""} ${c.individualFirstName || ""}`.trim() ||
    "N/A"
  );
}

export const createColumns = (config: ColumnsConfig): ColumnDef<ProjectRow>[] => {
  const { domain, clients = [], products = [], kanbans = [] } = config;
  const handleProjectEdit = createProjectEditHandler(domain);

  const clientOptions: SelectOption[] = clients.map((c) => ({
    value: c.id,
    label: getClientLabel(c),
  }));

  const productOptions: SelectOption[] = products.map((p) => ({
    value: p.id,
    label: [p.name, p.type].filter(Boolean).join(" "),
  }));

  const kanbanOptions: SelectOption[] = kanbans.map((k) => ({
    value: k.id,
    label: k.title || "N/A",
  }));

  // Async loader for kanban columns (reparto) – fetches columns for the row's current kanban
  const loadKanbanColumns = async (rowData: ProjectRow): Promise<SelectOption[]> => {
    const kanbanId = rowData.kanbanId ?? rowData.Kanban?.id;
    if (!kanbanId) return [];
    try {
      const response = await fetch(`/api/kanban-columns/${kanbanId}`);
      if (!response.ok) return [];
      const data = await response.json();
      return (data || []).map((col: any) => ({
        value: col.id,
        label: col.title || "N/A",
      }));
    } catch {
      return [];
    }
  };

  return [
    // --- Select ---
    {
      id: "select",
      header: ({ table }) => (
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
            const scrollPositions = saveScrollPositions(e.currentTarget as HTMLElement);
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

    // --- Codice (link to project detail) ---
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
        <Link
          href={`/sites/${domain}/progetti/${row.original.id}`}
          className="font-medium text-primary hover:underline truncate block"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.unique_code || "-"}
        </Link>
      ),
    },

    // --- Cliente (dropdown) ---
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
        const clientName = rowData.Client
          ? getClientLabel(rowData.Client)
          : undefined;

        return (
          <EditableSelectCell
            value={rowData.clientId ?? rowData.Client?.id}
            displayValue={clientName}
            row={row}
            field="clientId"
            options={clientOptions}
            onSave={handleProjectEdit}
            placeholder="Seleziona cliente"
          />
        );
      },
    },

    // --- Nome oggetto (inline text) ---
    {
      accessorKey: "nome_oggetto",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nome oggetto" />
      ),
      size: 180,
      minSize: 100,
      maxSize: 400,
      enableResizing: true,
      cell: ({ row }) => (
        <EditableCell
          value={row.original.name ?? row.original.title}
          row={row}
          field="name"
          type="text"
          onSave={handleProjectEdit}
          placeholder="-"
        />
      ),
    },

    // --- Prodotto (dropdown) ---
    {
      accessorKey: "product",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Prodotto" />
      ),
      size: 150,
      minSize: 80,
      maxSize: 400,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        const productDisplay = rowData.SellProduct?.name
          ? [rowData.SellProduct.name, rowData.SellProduct.type]
              .filter(Boolean)
              .join(" ")
          : undefined;

        return (
          <EditableSelectCell
            value={rowData.sellProductId ?? rowData.SellProduct?.id}
            displayValue={productDisplay}
            row={row}
            field="productId"
            options={productOptions}
            onSave={handleProjectEdit}
            placeholder="Seleziona prodotto"
          />
        );
      },
    },

    // --- Kanban (dropdown) ---
    {
      accessorKey: "kanban",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Kanban" />
      ),
      size: 130,
      minSize: 80,
      maxSize: 300,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <EditableSelectCell
            value={rowData.kanbanId ?? rowData.Kanban?.id}
            displayValue={rowData.Kanban?.title || undefined}
            row={row}
            field="kanbanId"
            options={kanbanOptions}
            onSave={handleProjectEdit}
            placeholder="Seleziona kanban"
          />
        );
      },
    },

    // --- Reparto / Colonna (dropdown with async loading) ---
    {
      accessorKey: "reparto",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reparto" />
      ),
      size: 130,
      minSize: 80,
      maxSize: 300,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        return (
          <EditableSelectCell
            value={rowData.kanbanColumnId ?? rowData.KanbanColumn?.id}
            displayValue={rowData.KanbanColumn?.title || undefined}
            row={row}
            field="kanbanColumnId"
            getOptions={loadKanbanColumns}
            onSave={handleProjectEdit}
            placeholder="Seleziona reparto"
          />
        );
      },
    },

    // --- CAP ---
    {
      accessorKey: "luogo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="CAP" />
      ),
      size: 80,
      minSize: 60,
      maxSize: 120,
      enableResizing: true,
      cell: ({ row }) => {
        const rowData = row.original;
        const cap =
          rowData.Client?.zipCode ||
          (rowData.luogo ? extractCAP(rowData.luogo) : null);
        return (
          <span className="truncate block" title={cap?.toString() || "-"}>
            {cap || "-"}
          </span>
        );
      },
    },

    // --- Note (editable popover) ---
    {
      id: "notes_icon",
      header: () => (
        <div className="flex items-center justify-center w-full">
          <span className="text-xs font-medium">Note</span>
        </div>
      ),
      size: 50,
      minSize: 40,
      maxSize: 60,
      enableResizing: false,
      cell: ({ row }) => (
        <EditableNotesCell
          value={row.original.other}
          row={row}
          field="other"
          onSave={handleProjectEdit}
        />
      ),
    },

    // --- Reports ---
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
        const currentDomain = domain || window.location.pathname.split("/")[2];
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

    // --- Google Maps ---
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

    // --- Consuntivo ---
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
        const currentDomain = domain || window.location.pathname.split("/")[2];
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
                      window.location.href = `/sites/${currentDomain}/progetti/${projectId}`;
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

    // --- Project files ---
    {
      id: "project_files",
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
        const projectId = row.original.id;
        const fileCount = row.original.fileCount || 0;
        const currentDomain = domain || window.location.pathname.split("/")[2];
        const hasFiles = fileCount > 0;

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
                      window.location.href = `/sites/${currentDomain}/progetti/${projectId}`;
                    }}
                  >
                    {hasFiles ? (
                      <Folder className="h-4 w-4 text-primary fill-primary/20" />
                    ) : (
                      <Folder className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {hasFiles
                      ? `${fileCount} documento/i`
                      : "Nessun documento"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },

    // --- Consegna (editable date picker) ---
    {
      accessorKey: "deliveryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Consegna" />
      ),
      size: 100,
      minSize: 70,
      maxSize: 150,
      enableResizing: true,
      cell: ({ row }) => (
        <EditableDateCell
          value={row.original.deliveryDate}
          row={row}
          field="deliveryDate"
          onSave={handleProjectEdit}
          disabled={isWeekend}
        />
      ),
    },

    // --- Valore (editable number) ---
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

    // --- Archiviato ---
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
          <Badge
            variant={archived ? "secondary" : "outline"}
            className="text-xs"
          >
            {archived ? "Sì" : "No"}
          </Badge>
        );
      },
    },

    // --- Ultima modifica ---
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
        const updateDate = row.original.updated_at
          ? new Date(row.original.updated_at)
          : null;

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

    // --- Azioni ---
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

export const columns = createColumns({});
