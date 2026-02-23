"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Action,
  Client,
  KanbanColumn,
  PackingControl,
  QualityControl,
  SellProduct,
  Task,
  User,
} from "@/types/supabase";
import { DateManager } from "../../package/utils/dates/date-manager";
import { calculateCurrentValue } from "../../package/utils/various/calculateCurrentValue";
import { logger } from "@/lib/logger";
import { 
  FileEdit, 
  MapPin, 
  Sofa, 
  DoorOpen, 
  LayoutGrid, 
  Wrench, 
  Package,
  Tag,
  LucideIcon
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import { Badge } from "../ui/badge";
import { useSiteId } from "@/hooks/use-site-id";

// Mappatura icone categoria (fallback per categorie senza icona custom)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "arredamento": Sofa,
  "porte": DoorOpen,
  "serramenti": LayoutGrid,
  "accessori": Wrench,
};

// Icona di default per categorie non mappate
const DEFAULT_CATEGORY_ICON = Tag;

// Funzione per ottenere l'icona della categoria
const getCategoryIcon = (categoryName?: string | null): LucideIcon => {
  if (!categoryName) return DEFAULT_CATEGORY_ICON;
  const normalizedName = categoryName.toLowerCase().trim();
  return CATEGORY_ICONS[normalizedName] || DEFAULT_CATEGORY_ICON;
};

// Funzione per generare colori derivati da un colore base
const getDerivedColors = (baseColor: string | null | undefined) => {
  if (!baseColor) {
    return {
      color: "#6B7280",        // Grigio default
      bgColor: "#F3F4F6",
      textColor: "#374151",
    };
  }
  return {
    color: baseColor,
    bgColor: `${baseColor}20`,  // 20% opacity
    textColor: baseColor,
  };
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import EditTaskKanban from "./editKanbanTask";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";

import { archiveItem } from "@/app/sites/[domain]/kanban/actions/archived-item-action";

type Supplier = {
  id: number;
  name: string;
  short_name: string | null;
  isDefault: boolean;
};

type TaskSupplier = {
  id: number;
  supplierId: number;
  supplier: Supplier;
  deliveryDate: string | null;
};

export default function Card({
  id,
  title,
  data,
  columnIndex,
  history,
  isSmall: isSmallInitial,
  domain,
  onTaskDeleted,
}: {
  id: number;
  title: string;
  data: Task | Client | any;
  columnIndex: number;
  history: Action;
  isSmall: boolean;
  domain?: string;
  onTaskDeleted?: () => void;
}) {
  const { siteId } = useSiteId(domain);
  const [showModal, setShowModal] = useState(false);
  const [isLocked, setIsLocked] = useState(data.locked);
  const [timeState, setTimeState] = useState("normal");
  const [clickTimeout, setClickTimeout] = useState<any | null>(null);
  const [currentValue, setCurrentValue] = useState(0);
  const { toast } = useToast();
  const [taskSuppliers, setTaskSuppliers] = useState<TaskSupplier[]>([]);

  // Determina se la card deve essere small in base a display_mode
  const displayMode = data.display_mode || data.displayMode || "normal";
  // Cards con display_mode small (offerte vinte/perse) suggeriscono small ma non forzano
  const suggestsSmallFromDisplayMode =
    displayMode === "small_green" || displayMode === "small_red";
  
  // SPEDITO column suggerisce small di default
  const isInSpeditoColumn = data.column?.identifier === "SPEDITO";

  // Funzione per determinare lo stato di default (da localStorage o suggerimenti)
  const getDefaultSmallState = () => {
    // Prova a caricare da localStorage
    try {
      const saved = localStorage.getItem(`isSmall-${id}`);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (error) {
      logger.warn("Error parsing localStorage value for isSmall:", error);
    }
    // Default: small se display_mode lo suggerisce o se in SPEDITO
    return suggestsSmallFromDisplayMode || isInSpeditoColumn;
  };

  // Determina lo stato iniziale di isSmall
  // isSmallInitial: null = usa localStorage/default, true = chiudi tutte, false = apri tutte
  const [isSmall, setIsSmall] = useState(() => {
    // Se isSmallInitial è null o undefined, usa localStorage/defaults
    if (isSmallInitial === null || isSmallInitial === undefined) {
      return getDefaultSmallState();
    }
    // Altrimenti usa il valore passato dal toggle globale
    return isSmallInitial;
  });

  // Sync con il comando globale "Chiudi tutte le tab" / "Apri tutte le tab"
  useEffect(() => {
    // isSmallInitial: null = non attivato (ignora), true = chiudi tutte, false = apri tutte
    if (isSmallInitial === true) {
      setIsSmall(true);
    } else if (isSmallInitial === false) {
      // "Apri tutte" - apre anche le card in SPEDITO e quelle con display_mode small
      setIsSmall(false);
    }
    // Se isSmallInitial è null, non fare nulla (mantieni stato corrente)
  }, [isSmallInitial]);

  // Salva lo stato locale solo quando l'utente fa doppio click (toggle manuale)
  // NON salvare quando cambia a causa del toggle globale
  const saveToLocalStorage = (value: boolean) => {
    try {
      localStorage.setItem(`isSmall-${id}`, JSON.stringify(value));
    } catch (error) {
      logger.warn("Error saving to localStorage:", error);
    }
  };

  useEffect(() => {
    // Check if delivery date is past
    if (data.deliveryDate) {
      const currentTime = new Date();
      const targetTime = new Date(data.deliveryDate);
      if (
        currentTime.getTime() > targetTime.getTime() &&
        data.column?.identifier !== "SPEDITO"
      ) {
        setTimeState("late");
      } else {
        setTimeState("normal");
      }
    }
  }, [data.deliveryDate, data.column?.identifier]);

  useEffect(() => {
    setCurrentValue(calculateCurrentValue(data, columnIndex));
  }, [data, columnIndex]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const taskSuppResponse = await fetch(`/api/tasks/${id}/suppliers`);
        if (!taskSuppResponse.ok) {
          throw new Error("Failed to fetch suppliers");
        }
        const taskSuppData = await taskSuppResponse.json();
        setTaskSuppliers(Array.isArray(taskSuppData) ? taskSuppData : []);
      } catch (error) {
        logger.error("Error loading suppliers:", error);
        setTaskSuppliers([]);
      }
    };

    loadSuppliers();
  }, [id]);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id.toString(),
      data: {
        id,
        columnIndex,
        fromColumn: data.column?.identifier,
        fromColumnPosition: data.column?.position || columnIndex,
      },
      disabled: isLocked || data.isPreview,
    });

  const dragStyle = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const onClick = useCallback(
    (e: any) => {
      if (e.target.closest("button") || e.target.closest(".button-container")) {
        return;
      }

      if (clickTimeout) {
        // Double click - toggle small/expanded state
        clearTimeout(clickTimeout);
        setClickTimeout(null);
        const newValue = !isSmall;
        setIsSmall(newValue);
        // Save to localStorage only on manual toggle (double click)
        saveToLocalStorage(newValue);
      } else {
        // Single click - open modal after delay
        setClickTimeout(
          setTimeout(() => {
            if (!showModal) {
              setShowModal(true);
            }
            setClickTimeout(null);
          }, 250)
        );
      }
    },
    [showModal, isSmall, clickTimeout]
  );

  async function handleArchive(data: Task) {
    if (data.archived) {
      await archiveItem(false, data.id);
    } else {
      await archiveItem(true, data.id);
      toast({
        description: `${data.unique_code} è stato archiviato.`,
      });
    }
  }

  // Check if category colors are enabled for this kanban
  const showCategoryColors = data.kanban?.show_category_colors || data.kanban?.showCategoryColors || false;

  // Get product category info
  const productCategory = useMemo(() => {
    const sellProduct = data.sellProduct || data.sell_product;
    if (!sellProduct) return null;
    
    // Category can be nested or direct
    const category = sellProduct.category;
    if (!category) return null;
    
    // Handle array (Supabase join can return array)
    const categoryData = Array.isArray(category) ? category[0] : category;
    return categoryData || null;
  }, [data.sellProduct, data.sell_product]);

  // Get category icon (from mapping based on name)
  const CategoryIcon = useMemo(() => {
    return getCategoryIcon(productCategory?.name);
  }, [productCategory?.name]);

  // Get derived colors from database color
  const categoryColors = useMemo(() => {
    return getDerivedColors(productCategory?.color);
  }, [productCategory?.color]);

  // Get product display name
  const getProductDisplay = () => {
    const sellProduct = data.sellProduct || data.sell_product;
    if (!sellProduct) return null;
    return sellProduct.name || sellProduct.type || null;
  };

  // Determina il colore del bordo sinistro in base allo stato
  const getBorderColor = () => {
    // Bozza ha priorità - bordo arancione
    if (isDraft) {
      return "#f59e0b"; // amber-500
    }
    // display_mode ha priorità
    if (displayMode === "small_green") {
      return "#22c55e"; // green-500
    }
    if (displayMode === "small_red") {
      return "#ef4444"; // red-500
    }
    // Ritardo
    if (timeState === "late") {
      return "#ef4444"; // red-500
    }
    // Usa il colore della categoria prodotto solo se abilitato nelle impostazioni kanban
    if (showCategoryColors && productCategory?.color) {
      return productCategory.color;
    }
    // Normale
    return "#64748b"; // slate-500
  };

  // Check if task is a draft
  const isDraft = data.is_draft || data.isDraft;

  // Get client display name
  const getClientName = () => {
    if (!data.client) return "-";
    if (data.client.clientType === "BUSINESS") {
      return data.client.businessName || "-";
    }
    const firstName = data.client.individualFirstName || "";
    const lastName = data.client.individualLastName || "";
    return `${lastName} ${firstName}`.trim() || "-";
  };

  // Get pieces count
  const getPiecesDisplay = () => {
    if (data.numero_pezzi && data.numero_pezzi > 0) {
      return `${data.numero_pezzi} pz`;
    }
    if (data.positions && data.positions.length > 0) {
      const filledPositions = data.positions.filter(
        (p: string) => p && p.trim() !== ""
      ).length;
      if (filledPositions > 0) {
        return `${filledPositions} pos.`;
      }
    }
    return "-";
  };

  return (
    <ContextMenu>
      <div
        className={`
          w-full mb-2 rounded-r-xl rounded-l-sm select-none overscroll-contain
          bg-white dark:bg-slate-900 
          border-y border-r border-slate-200 dark:border-slate-700
          border-l-4
          shadow-sm hover:shadow-md transition-all duration-200
          ${data.isPreview ? "opacity-75 cursor-not-allowed" : ""}
          ${isDraft ? "border-2 border-dashed border-amber-400" : ""}
        `}
        ref={data.isPreview ? undefined : setNodeRef}
        style={{
          ...dragStyle,
          opacity: isDragging ? 0.5 : 1,
          cursor: data.isPreview ? "not-allowed" : "move",
          borderLeftColor: getBorderColor(),
          borderLeftWidth: "4px",
          borderLeftStyle: "solid",
        }}
        {...(data.isPreview ? {} : { ...listeners, ...attributes })}
        onContextMenu={(e) => e.preventDefault()}
        onClick={onClick}
      >
        {/* Draft badge */}
        {isDraft && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-1.5 py-0.5 flex items-center gap-1">
              <FileEdit className="h-3 w-3" />
              Bozza
            </Badge>
          </div>
        )}

        <ContextMenuTrigger>
          {!isSmall ? (
            /* ==================== CARD NORMAL (ESPANSA) ==================== */
            <div className="relative text-slate-800 dark:text-slate-100 pb-2">
              <div className="px-2.5 pt-2.5 pb-1.5">
                {/* Header: N°, Data, Settimana */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 mb-1.5">
                  <span className="font-bold text-sm">{data.unique_code}</span>
                  {data.deliveryDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <span>{DateManager.formatEUDate(data.deliveryDate)}</span>
                      <span className="font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        S.{DateManager.getWeekNumber(data.deliveryDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Badge Categoria Prodotto - Solo se abilitato nelle impostazioni Kanban */}
                {showCategoryColors && (productCategory || getProductDisplay()) && (
                  <div 
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-2 -mx-0.5"
                    style={{ 
                      backgroundColor: categoryColors.bgColor,
                      borderLeft: `3px solid ${categoryColors.color}`
                    }}
                  >
                    <CategoryIcon 
                      className="h-4 w-4 shrink-0" 
                      style={{ color: categoryColors.color }}
                    />
                    <span 
                      className="font-semibold text-sm truncate"
                      style={{ color: categoryColors.textColor }}
                    >
                      {productCategory?.name || getProductDisplay() || "Prodotto"}
                    </span>
                    {productCategory && getProductDisplay() && productCategory.name !== getProductDisplay() && (
                      <span 
                        className="text-xs opacity-75 truncate"
                        style={{ color: categoryColors.textColor }}
                      >
                        · {getProductDisplay()}
                      </span>
                    )}
                  </div>
                )}

                {/* Nome Cliente */}
                <div className="font-semibold text-base mb-1 truncate">
                  {getClientName()}
                </div>

                {/* Luogo · Nome oggetto */}
                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {data.luogo && (
                    <>
                      <MapPin className="h-3 w-3" />
                      <span>{data.luogo}</span>
                      <span className="mx-1">·</span>
                    </>
                  )}
                  <span className="truncate">{data.name || "-"}</span>
                </div>

                {/* Pezzi e Valore */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 mb-2">
                  <div className="text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Pezzi
                    </span>
                    <span className="font-bold text-sm">
                      {getPiecesDisplay()}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Valore
                    </span>
                    <span className="font-bold text-sm">
                      {((data.sellPrice || 0) / 1000).toFixed(1)}K
                    </span>
                  </div>
                </div>

                {/* Note */}
                {data.other && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 mb-2 line-clamp-2">
                    {data.other}
                  </div>
                )}

                {/* Fornitori */}
                {taskSuppliers && taskSuppliers.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                      Fornitori
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {taskSuppliers.map((ts) => {
                        const isDeliveryToday =
                          ts.deliveryDate &&
                          new Date(ts.deliveryDate).toDateString() ===
                            new Date().toDateString();
                        const isDeliveryLate =
                          ts.deliveryDate &&
                          new Date(ts.deliveryDate) < new Date();

                        return (
                          <div
                            key={ts.id}
                            className={`
                              text-xs px-1.5 py-0.5 rounded-md
                              ${
                                isDeliveryToday
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800"
                                  : isDeliveryLate
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              }
                            `}
                          >
                            <span className="font-medium">
                              {ts.supplier?.short_name ||
                                ts.supplier?.name ||
                                "?"}
                            </span>
                            {ts.deliveryDate && (
                              <span className="ml-1 opacity-75">
                                {new Date(ts.deliveryDate).toLocaleDateString(
                                  "it-IT",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                  }
                                )}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar integrata nella base */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-br-xl overflow-hidden">
                <div
                  style={{ width: `${data.percentStatus || 0}%` }}
                  className="h-full bg-green-500 transition-all duration-300"
                />
              </div>
              <div className="absolute bottom-0 right-2 text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-normal">
                {data.percentStatus || 0}%
              </div>
            </div>
          ) : (
            /* ==================== CARD SMALL (COMPRESSA) ==================== */
            <div className="relative text-slate-800 dark:text-slate-100 pb-1.5">
              <div className="px-2 pt-2 pb-1">
                {/* Riga 1: N° + Icona Categoria (se abilitata), Data, Settimana */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {/* Icona categoria prodotto - solo se abilitato */}
                    {showCategoryColors && productCategory && (
                      <CategoryIcon 
                        className="h-3.5 w-3.5 shrink-0" 
                        style={{ color: categoryColors.color }}
                      />
                    )}
                    <span className="font-bold text-sm">{data.unique_code}</span>
                  </div>
                  {data.deliveryDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span>{DateManager.formatEUDate(data.deliveryDate)}</span>
                      <span className="font-semibold">
                        S.{DateManager.getWeekNumber(data.deliveryDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Riga 2: Categoria Prodotto - solo se abilitato nelle impostazioni Kanban */}
                {showCategoryColors && (productCategory || getProductDisplay()) && (
                  <div 
                    className="text-xs font-medium truncate mb-1 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                    style={{ 
                      backgroundColor: `${categoryColors.color}15`,
                      color: categoryColors.textColor
                    }}
                  >
                    {productCategory?.name || getProductDisplay()}
                  </div>
                )}

                {/* Riga 3: Cliente · Oggetto */}
                <div className="text-sm truncate mb-1 text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{getClientName()}</span>
                  {data.name && (
                    <>
                      <span className="mx-1 text-slate-400">·</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {data.name}
                      </span>
                    </>
                  )}
                </div>

                {/* Riga 4: Pezzi, Valore */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    {getPiecesDisplay()}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="font-semibold">
                    {((data.sellPrice || 0) / 1000).toFixed(1)}K
                  </span>
                </div>
              </div>

              {/* Progress bar integrata nella base */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-br-xl overflow-hidden">
                <div
                  style={{ width: `${data.percentStatus || 0}%` }}
                  className="h-full bg-green-500 transition-all duration-300"
                />
              </div>
              <div className="absolute bottom-0 right-1.5 text-[9px] font-medium text-slate-600 dark:text-slate-400 leading-none">
                {data.percentStatus || 0}%
              </div>
            </div>
          )}

          <Dialog open={showModal} onOpenChange={(open) => setShowModal(open)}>
            <DialogContent className="max-w-228 max-h-[90%] overflow-scroll">
              <DialogHeader>
                <DialogTitle>Modifica {data.unique_code}</DialogTitle>
              </DialogHeader>
              <EditTaskKanban
                handleClose={(wasDeleted?: boolean) => {
                  setShowModal(false);
                  if (wasDeleted && onTaskDeleted) {
                    onTaskDeleted();
                  }
                }}
                setIsLocked={setIsLocked}
                open={showModal}
                setOpenModal={setShowModal}
                setOpen={setShowModal}
                resource={data}
                history={history}
                domain={domain}
              />
            </DialogContent>
          </Dialog>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleArchive(data);
            }}
          >
            Archivia progetto
          </ContextMenuItem>
        </ContextMenuContent>
      </div>
    </ContextMenu>
  );
}
