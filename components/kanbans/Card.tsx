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
import { formatLocalDate, parseLocalDate, startOfLocalDay } from "@/lib/utils";
import { 
  FileEdit, 
  MapPin, 
  Sofa, 
  DoorOpen, 
  LayoutGrid, 
  Wrench, 
  Package,
  Tag,
  Image as ImageIcon,
  LucideIcon,
  Copy,
  Trash2,
  Archive,
  Users,
  Truck,
  Cog,
  AlertTriangle
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import { Badge } from "../ui/badge";
import { ManagerGuideButton } from "@/components/manager-guide";
import { useUserContext } from "@/hooks/use-user-context";
import { useRouter } from "next/navigation";

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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

const isImagePath = (value?: string | null): boolean => {
  if (!value || typeof value !== "string") return false;
  const cleanValue = value.split("?")[0] || "";
  const extension = cleanValue.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.includes(extension);
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
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";

import { archiveItem } from "@/app/sites/[domain]/kanban/actions/archived-item-action";
import { removeItem } from "@/app/sites/[domain]/projects/actions/delete-item.action";
import { duplicateItem } from "@/app/sites/[domain]/kanban/actions/duplicate-item.action";
import {
  DEFAULT_CARD_FIELD_CONFIG,
  type CardFieldConfig,
} from "./card-display-config";
import { resolveCoverImage } from "@/lib/cover-image";
import { formatHours } from "@/lib/project-consuntivo";

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

type CollaboratorTimeSummary = {
  id: string;
  name: string;
  initials: string;
  picture: string | null;
  hours: number;
  entries: number;
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
  cardFieldConfig,
}: {
  id: number;
  title: string;
  data: Task | Client | any;
  columnIndex: number;
  history: Action;
  isSmall: boolean;
  domain?: string;
  onTaskDeleted?: () => void;
  cardFieldConfig?: CardFieldConfig;
}) {
  const router = useRouter();
  const { userContext } = useUserContext();
  const shouldPersistVisualPreferences =
    process.env.NEXT_PUBLIC_ENABLE_CARD_PREFS === "true";
  const [showModal, setShowModal] = useState(false);
  const [isLocked, setIsLocked] = useState(data.locked);
  const [clickTimeout, setClickTimeout] = useState<any | null>(null);
  const [currentValue, setCurrentValue] = useState(0);
  const { toast } = useToast();
  const [taskSuppliers, setTaskSuppliers] = useState<TaskSupplier[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const cardCoverPreferenceStorageKey = `card-cover-preference-${id}`;
  const canAccessConsuntivo =
    userContext?.role === "admin" || userContext?.role === "superadmin";
  const resolvedDomain = domain || data?.domain || "";

  // Determina se la card deve essere small in base a display_mode
  const displayMode = data.display_mode || data.displayMode || "normal";
  // Cards con display_mode small (offerte vinte/perse) suggeriscono small ma non forzano
  const suggestsSmallFromDisplayMode =
    displayMode === "small_green" || displayMode === "small_red";
  
  // SPEDITO column suggerisce small di default
  const isInSpeditoColumn = data.column?.identifier === "SPEDITO";

  // Funzione per determinare lo stato di default (da localStorage o suggerimenti)
  const getDefaultSmallState = () => {
    if (!shouldPersistVisualPreferences) {
      return suggestsSmallFromDisplayMode || isInSpeditoColumn;
    }
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

  const [preferProjectCoverImage, setPreferProjectCoverImage] = useState(() => {
    if (!shouldPersistVisualPreferences) {
      return false;
    }
    try {
      const saved = localStorage.getItem(cardCoverPreferenceStorageKey);
      return saved === "project";
    } catch (error) {
      logger.warn("Error reading card cover preference:", error);
      return false;
    }
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
    if (!shouldPersistVisualPreferences) {
      return;
    }
    try {
      localStorage.setItem(`isSmall-${id}`, JSON.stringify(value));
    } catch (error) {
      logger.warn("Error saving to localStorage:", error);
    }
  };

  const persistCoverPreference = useCallback(
    (preferProject: boolean) => {
      if (shouldPersistVisualPreferences) {
        try {
          localStorage.setItem(
            cardCoverPreferenceStorageKey,
            preferProject ? "project" : "product"
          );
        } catch (error) {
          logger.warn("Error saving card cover preference:", error);
        }
      }
      setPreferProjectCoverImage(preferProject);
    },
    [cardCoverPreferenceStorageKey, shouldPersistVisualPreferences]
  );

  // Stato temporale a 4 livelli:
  // - "normal": nessuna urgenza (no data, colonna SPEDITO, o consegna > 3 giorni futuri)
  // - "atRisk": consegna tra oggi e +3 giorni
  // - "late": consegna passata fino a 7 giorni fa
  // - "critical": consegna passata da piu' di 7 giorni
  // Soglie centralizzate qui: cambiarle se serve una policy diversa.
  const deliveryTimeInfo = useMemo<{
    state: "normal" | "atRisk" | "late" | "critical";
    days: number;
  }>(() => {
    if (!data.deliveryDate || data.column?.identifier === "SPEDITO") {
      return { state: "normal", days: 0 };
    }
    try {
      const today = startOfLocalDay(new Date());
      const delivery = startOfLocalDay(parseLocalDate(data.deliveryDate));
      const diffDays = Math.round(
        (delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < -7) return { state: "critical", days: -diffDays };
      if (diffDays < 0) return { state: "late", days: -diffDays };
      if (diffDays <= 3) return { state: "atRisk", days: diffDays };
      return { state: "normal", days: diffDays };
    } catch {
      return { state: "normal", days: 0 };
    }
  }, [data.deliveryDate, data.column?.identifier]);

  const timeState = deliveryTimeInfo.state;
  const daysDelta = deliveryTimeInfo.days;

  useEffect(() => {
    setCurrentValue(calculateCurrentValue(data, columnIndex));
  }, [data, columnIndex]);

  useEffect(() => {
    if (Array.isArray(data.taskSuppliers)) {
      setTaskSuppliers(data.taskSuppliers);
      return;
    }

    if (isSmall && !showModal) {
      setTaskSuppliers([]);
      return;
    }

    let isCancelled = false;

    const loadSuppliers = async () => {
      try {
        const taskSuppResponse = await fetch(`/api/tasks/${id}/suppliers`);
        if (!taskSuppResponse.ok) {
          throw new Error("Failed to fetch suppliers");
        }
        const taskSuppData = await taskSuppResponse.json();
        if (!isCancelled) {
          setTaskSuppliers(Array.isArray(taskSuppData) ? taskSuppData : []);
        }
      } catch (error) {
        logger.error("Error loading suppliers:", error);
        if (!isCancelled) {
          setTaskSuppliers([]);
        }
      }
    };

    loadSuppliers();

    return () => {
      isCancelled = true;
    };
  }, [data.taskSuppliers, id, isSmall, showModal]);

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
        // Single click - open modal after delay (for every role)
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

  // Admin/superadmin: clicking the project code navigates to the consuntivo page.
  // Non-admin users see unique_code as plain text (no handler).
  const handleOpenProjectConsuntivo = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!canAccessConsuntivo || !resolvedDomain) return;
      router.push(`/sites/${resolvedDomain}/progetti/${id}`);
    },
    [canAccessConsuntivo, resolvedDomain, router, id]
  );

  const handleOpenClientSheet = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const clientId = data?.client?.id || data?.clientId;
      if (!resolvedDomain || !clientId) return;
      router.push(`/sites/${resolvedDomain}/clients?edit=${clientId}`);
    },
    [resolvedDomain, router, data?.client?.id, data?.clientId]
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

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await removeItem(id, domain);
      if (result && typeof result === 'object' && 'error' in result) {
        toast({
          variant: "destructive",
          description: result.message || "Errore nella cancellazione",
        });
      } else {
        toast({
          description: `${data.unique_code} è stato cancellato.`,
        });
        if (onTaskDeleted) {
          onTaskDeleted();
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore nella cancellazione del progetto",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const result = await duplicateItem(id, domain);
      if (result.error) {
        toast({
          variant: "destructive",
          description: result.message || "Errore nella duplicazione",
        });
      } else {
        toast({
          description: result.message || `Progetto duplicato con successo`,
        });
        if (onTaskDeleted) {
          // Reuse the same callback to refresh the kanban
          onTaskDeleted();
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore nella duplicazione del progetto",
      });
    } finally {
      setIsDuplicating(false);
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
  const productDisplayName = useMemo(() => {
    const sellProduct = data.sellProduct || data.sell_product;
    if (!sellProduct) return null;
    return sellProduct.name || sellProduct.type || null;
  }, [data.sellProduct, data.sell_product]);

  const productImageUrl = useMemo(() => {
    const sellProduct = data.sellProduct || data.sell_product;
    if (!sellProduct) {
      return null;
    }

    const imageUrl = sellProduct.image_url || sellProduct.imageUrl || null;
    if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
      return null;
    }

    return imageUrl;
  }, [data.sellProduct, data.sell_product]);

  const projectImageUrl = useMemo(() => {
    if (!Array.isArray(data.files)) {
      return null;
    }

    const projectImage = data.files.find((file: any) =>
      isImagePath(file?.name) || isImagePath(file?.url)
    );

    const imageUrl = projectImage?.url;
    if (typeof imageUrl !== "string" || imageUrl.trim().length === 0) {
      return null;
    }

    return imageUrl;
  }, [data.files]);

  const cardImage = useMemo(() => {
    return resolveCoverImage({
      productImageUrl,
      projectImageUrl,
      preferProjectCoverImage,
      productCategoryName: productCategory?.name || null,
      productType: data.sellProduct?.type || data.sell_product?.type || null,
      productName: productDisplayName,
      projectName: data.name || null,
      projectLocation: data.luogo || null,
      projectNotes: data.other || null,
    });
  }, [
    data.name,
    data.luogo,
    data.other,
    data.sellProduct?.type,
    data.sell_product?.type,
    preferProjectCoverImage,
    productCategory?.name,
    productDisplayName,
    productImageUrl,
    projectImageUrl,
  ]);
  const cardImageUrl = cardImage.imageUrl || "/placeholders/default.svg";
  const showCoverSourceBadge =
    process.env.NEXT_PUBLIC_SHOW_COVER_SOURCE_BADGE === "true";

  // Determina il colore del bordo sinistro in base allo stato.
  //
  // Regola (da AVOR in avanti / tutti i kanban con show_category_colors = true):
  //   il bordo riflette UNICAMENTE il colore categoria del prodotto.
  //   Gli altri segnali (bozza / esito offerta / ritardo) sono comunicati
  //   tramite badge e stili alternativi (bordo tratteggiato per bozza,
  //   sfondo rosso tenue per critical, badge -Xg per late/atRisk/critical).
  //
  // Regola legacy (usata nel kanban offerte dove show_category_colors = false):
  //   priorita' bozza -> esito offerta -> ritardo -> neutro.
  const getBorderColor = () => {
    if (showCategoryColors) {
      // Modalita' "colore prodotto": il bordo segue solo la categoria prodotto.
      // Se manca, neutro (slate) - gli altri stati restano visibili nei badge.
      return productCategory?.color || "#64748b"; // slate-500 come fallback
    }

    // --- Logica legacy (kanban offerte) ---
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
    // Fallback sullo stato temporale
    if (timeState === "critical" || timeState === "late") {
      return "#ef4444"; // red-500
    }
    if (timeState === "atRisk") {
      return "#eab308"; // yellow-500
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

  const resolvedFieldConfig = useMemo(() => {
    const normalConfig = {
      ...DEFAULT_CARD_FIELD_CONFIG.normal,
      ...(cardFieldConfig?.normal || {}),
    };
    const smallConfig = {
      ...DEFAULT_CARD_FIELD_CONFIG.small,
      ...(cardFieldConfig?.small || {}),
    };
    return { normal: normalConfig, small: smallConfig };
  }, [cardFieldConfig]);

  const isFieldVisible = (field: keyof typeof DEFAULT_CARD_FIELD_CONFIG.normal) => {
    return isSmall
      ? resolvedFieldConfig.small[field]
      : resolvedFieldConfig.normal[field];
  };

  const activeCollaborators = useMemo(() => {
    if (!Array.isArray(data.activeCollaborators)) {
      return [];
    }
    return data.activeCollaborators;
  }, [data.activeCollaborators]);

  const collaboratorTimeSummaries = useMemo<CollaboratorTimeSummary[]>(() => {
    if (!Array.isArray(data.collaboratorTimeSummaries)) {
      return [];
    }
    return data.collaboratorTimeSummaries
      .map((item: any) => ({
        id: String(item?.id || ""),
        name: String(item?.name || "Collaboratore"),
        initials: String(item?.initials || ""),
        picture: typeof item?.picture === "string" ? item.picture : null,
        hours: Number(item?.hours || 0),
        entries: Number(item?.entries || 0),
      }))
      .filter((item: CollaboratorTimeSummary) => item.id && item.hours > 0)
      .sort(
        (a: CollaboratorTimeSummary, b: CollaboratorTimeSummary) =>
          b.hours - a.hours
      );
  }, [data.collaboratorTimeSummaries]);
  const workedCollaboratorsCount =
    collaboratorTimeSummaries.length > 0
      ? collaboratorTimeSummaries.length
      : activeCollaborators.length;

  const activeSuppliersCount = useMemo(() => {
    const todayStr = formatLocalDate(new Date());
    return taskSuppliers.filter((ts) => {
      if (!ts.deliveryDate) return true;
      const deliveryDateStr = formatLocalDate(parseLocalDate(ts.deliveryDate));
      return deliveryDateStr >= todayStr;
    }).length;
  }, [taskSuppliers]);

  const activeMachinesCount = useMemo(() => {
    const value = Number(data.activeMachinesCount || 0);
    return Number.isFinite(value) ? value : 0;
  }, [data.activeMachinesCount]);

  const showActivity = isFieldVisible("activity");

  // Badge di stato temporale da mostrare inline nell'header
  // (visibile sia in modalita' normal che small)
  const renderTimeStatusBadge = (compact: boolean = false) => {
    if (timeState === "normal") return null;
    const baseClasses = compact
      ? "h-4 px-1 text-[9px] gap-0.5"
      : "h-5 px-1.5 text-[10px] gap-1";
    const colorClasses =
      timeState === "critical"
        ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
        : timeState === "late"
        ? "bg-red-500 text-white hover:bg-red-600"
        : "bg-amber-500 text-white hover:bg-amber-600"; // atRisk
    const label =
      timeState === "atRisk"
        ? daysDelta === 0
          ? "Oggi"
          : `+${daysDelta}g`
        : `-${daysDelta}g`;
    const tooltip =
      timeState === "atRisk"
        ? daysDelta === 0
          ? "Consegna in scadenza oggi"
          : `Consegna tra ${daysDelta} ${daysDelta === 1 ? "giorno" : "giorni"}`
        : `In ritardo di ${daysDelta} ${daysDelta === 1 ? "giorno" : "giorni"}`;
    return (
      <Badge
        title={tooltip}
        className={`inline-flex items-center font-bold rounded ${baseClasses} ${colorClasses}`}
      >
        <AlertTriangle className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
        {label}
      </Badge>
    );
  };

  // Sfondo tenue per lo stato critical, per rafforzare la segnalazione
  // quando il bordo sinistro e' occupato dal colore categoria
  const criticalBgClass =
    timeState === "critical"
      ? "bg-red-50/70 dark:bg-red-950/20"
      : "bg-white dark:bg-slate-900";

  return (
    <ContextMenu>
      <div
        className={`
          w-full mb-2 rounded-r-xl rounded-l-sm select-none overscroll-contain
          ${criticalBgClass}
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
                  {isFieldVisible("projectCode") ? (
                    canAccessConsuntivo ? (
                      <button
                        type="button"
                        onClick={handleOpenProjectConsuntivo}
                        className="font-bold text-sm hover:underline underline-offset-4"
                        title="Apri consuntivi progetto"
                      >
                        {data.unique_code}
                      </button>
                    ) : (
                      <span className="font-bold text-sm">
                        {data.unique_code}
                      </span>
                    )
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-1">
                    {renderTimeStatusBadge(false)}
                    <ManagerGuideButton
                      label="Apri guida card progetto"
                      stepId="offer-details"
                      variant="ghost"
                      size="icon"
                      showMascot={false}
                      className="h-7 w-7 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    />
                    {isFieldVisible("date") && data.deliveryDate && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span>{DateManager.formatEUDate(data.deliveryDate)}</span>
                        <span className="font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          S.{DateManager.getWeekNumber(data.deliveryDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Badge Categoria Prodotto - Solo se abilitato nelle impostazioni Kanban */}
                {isFieldVisible("productCategory") &&
                  showCategoryColors &&
                  (productCategory || productDisplayName) && (
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md mb-2 -mx-0.5"
                      style={{
                        backgroundColor: categoryColors.bgColor,
                        borderLeft: `3px solid ${categoryColors.color}`,
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
                        {productCategory?.name || productDisplayName || "Prodotto"}
                      </span>
                      {productCategory &&
                        productDisplayName &&
                        productCategory.name !== productDisplayName && (
                          <span
                            className="text-xs opacity-75 truncate"
                            style={{ color: categoryColors.textColor }}
                          >
                            · {productDisplayName}
                          </span>
                        )}
                    </div>
                )}

                {isFieldVisible("image") && (
                  <div className="relative mb-2 rounded-lg border border-slate-200 bg-slate-50/80 p-1.5 dark:border-slate-700 dark:bg-slate-800/50">
                    {showCoverSourceBadge && (
                      <span className="absolute right-2 top-2 z-10 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {cardImage.source}
                      </span>
                    )}
                    {cardImageUrl ? (
                      <img
                        src={cardImageUrl}
                        alt={productDisplayName || "Immagine progetto"}
                        className="h-24 w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>Nessuna immagine</span>
                      </div>
                    )}
                  </div>
                )}

                {isFieldVisible("client") && (
                  <button
                    type="button"
                    onClick={handleOpenClientSheet}
                    className="font-semibold text-base mb-1 truncate text-left hover:underline underline-offset-4"
                  >
                    {getClientName()}
                  </button>
                )}

                {(isFieldVisible("location") || isFieldVisible("objectName")) && (
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {isFieldVisible("location") && data.luogo && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span>{data.luogo}</span>
                        {isFieldVisible("objectName") && <span className="mx-1">·</span>}
                      </>
                    )}
                    {isFieldVisible("objectName") && (
                      <span className="truncate">{data.name || "-"}</span>
                    )}
                  </div>
                )}

                {(isFieldVisible("pieces") || isFieldVisible("value")) && (
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 mb-2">
                    {isFieldVisible("pieces") && (
                      <div className="text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          Pezzi
                        </span>
                        <span className="font-bold text-sm">
                          {getPiecesDisplay()}
                        </span>
                      </div>
                    )}
                    {isFieldVisible("pieces") && isFieldVisible("value") && (
                      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    {isFieldVisible("value") && (
                      <div className="text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          Valore
                        </span>
                        <span className="font-bold text-sm">
                          {((data.sellPrice || 0) / 1000).toFixed(1)}K
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {isFieldVisible("notes") && data.other && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 mb-2 line-clamp-2">
                    {data.other}
                  </div>
                )}

                {isFieldVisible("suppliers") &&
                  taskSuppliers &&
                  taskSuppliers.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                        Fornitori
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {taskSuppliers.map((ts) => {
                          const todayStr = formatLocalDate(new Date());
                          const deliveryDateStr = ts.deliveryDate
                            ? formatLocalDate(parseLocalDate(ts.deliveryDate))
                            : null;
                          const isDeliveryToday = deliveryDateStr === todayStr;
                          const isDeliveryLate =
                            deliveryDateStr && deliveryDateStr < todayStr;

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
                                  {DateManager.format(ts.deliveryDate, "dd.MM")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {showActivity && (
                  <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                        <Users className="h-3 w-3" />
                        {workedCollaboratorsCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <Truck className="h-3 w-3" />
                        {activeSuppliersCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <Cog className="h-3 w-3" />
                        {activeMachinesCount}
                      </span>
                    </div>
                    {collaboratorTimeSummaries.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {collaboratorTimeSummaries.slice(0, 4).map((collab) => (
                          <div
                            key={collab.id}
                            title={`${collab.name} - ${formatHours(collab.hours)}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="h-6 w-6 overflow-hidden rounded-full border border-white/60 bg-slate-200 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100">
                                {collab.picture ? (
                                  <img
                                    src={collab.picture}
                                    alt={collab.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    {collab.initials || "?"}
                                  </div>
                                )}
                              </div>
                              <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                {collab.name}
                              </span>
                            </div>
                            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                              {formatHours(collab.hours)}
                            </span>
                          </div>
                        ))}
                        {collaboratorTimeSummaries.length > 4 && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            +{collaboratorTimeSummaries.length - 4} collaboratori con ore registrate
                          </p>
                        )}
                      </div>
                    ) : activeCollaborators.length > 0 ? (
                      <div className="mt-1.5 flex items-center gap-1">
                        {activeCollaborators.slice(0, 5).map((collab: any) => (
                          <div
                            key={collab.id}
                            title={collab.fullName || collab.email || "Collaboratore"}
                            className="h-6 w-6 overflow-hidden rounded-full border border-white/60 bg-slate-200 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100"
                          >
                            {collab.picture ? (
                              <img
                                src={collab.picture}
                                alt={collab.fullName || "Collaboratore"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                {collab.initials || "?"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
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
                    {isFieldVisible("productCategory") &&
                      showCategoryColors &&
                      productCategory && (
                      <CategoryIcon 
                        className="h-3.5 w-3.5 shrink-0" 
                        style={{ color: categoryColors.color }}
                      />
                    )}
                    {isFieldVisible("projectCode") && (
                      canAccessConsuntivo ? (
                        <button
                          type="button"
                          onClick={handleOpenProjectConsuntivo}
                          className="font-bold text-sm hover:underline underline-offset-4"
                          title="Apri consuntivi progetto"
                        >
                          {data.unique_code}
                        </button>
                      ) : (
                        <span className="font-bold text-sm">{data.unique_code}</span>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {renderTimeStatusBadge(true)}
                    <ManagerGuideButton
                      label="Apri guida card progetto"
                      stepId="offer-details"
                      variant="ghost"
                      size="icon"
                      showMascot={false}
                      className="h-6 w-6 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    />
                    {isFieldVisible("date") && data.deliveryDate && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{DateManager.formatEUDate(data.deliveryDate)}</span>
                        <span className="font-semibold">
                          S.{DateManager.getWeekNumber(data.deliveryDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Riga 2: Categoria Prodotto - solo se abilitato nelle impostazioni Kanban */}
                {isFieldVisible("productCategory") &&
                  showCategoryColors &&
                  (productCategory || productDisplayName) && (
                    <div
                      className="text-xs font-medium truncate mb-1 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                      style={{
                        backgroundColor: `${categoryColors.color}15`,
                        color: categoryColors.textColor,
                      }}
                    >
                      {productCategory?.name || productDisplayName}
                    </div>
                )}

                {isFieldVisible("image") && (
                  <div className="relative mb-1.5 rounded-md border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/50">
                    {showCoverSourceBadge && (
                      <span className="absolute right-1.5 top-1.5 z-10 rounded bg-slate-900/80 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        {cardImage.source}
                      </span>
                    )}
                    {cardImageUrl ? (
                      <img
                        src={cardImageUrl}
                        alt={productDisplayName || "Immagine progetto"}
                        className="h-14 w-full rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 text-[11px] text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        <ImageIcon className="h-3 w-3" />
                        <span>Nessuna immagine</span>
                      </div>
                    )}
                  </div>
                )}

                {(isFieldVisible("client") || isFieldVisible("objectName")) && (
                  <div className="text-sm truncate mb-1 text-slate-700 dark:text-slate-300">
                    {isFieldVisible("client") && (
                      <button
                        type="button"
                        onClick={handleOpenClientSheet}
                        className="font-medium text-left hover:underline underline-offset-4"
                        title="Apri scheda cliente"
                      >
                        {getClientName()}
                      </button>
                    )}
                    {isFieldVisible("objectName") && data.name && (
                      <>
                        {isFieldVisible("client") && (
                          <span className="mx-1 text-slate-400">·</span>
                        )}
                        <span className="text-slate-500 dark:text-slate-400">
                          {data.name}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {(isFieldVisible("location") || isFieldVisible("pieces") || isFieldVisible("value")) && (
                  <div className="flex items-center gap-1.5 text-xs mb-1">
                    {isFieldVisible("location") && data.luogo && (
                      <>
                        <MapPin className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[110px]">
                          {data.luogo}
                        </span>
                        {(isFieldVisible("pieces") || isFieldVisible("value")) && (
                          <span className="text-slate-400">|</span>
                        )}
                      </>
                    )}
                    {isFieldVisible("pieces") && (
                      <span className="text-slate-600 dark:text-slate-400">
                        {getPiecesDisplay()}
                      </span>
                    )}
                    {isFieldVisible("pieces") && isFieldVisible("value") && (
                      <span className="text-slate-400">|</span>
                    )}
                    {isFieldVisible("value") && (
                      <span className="font-semibold">
                        {((data.sellPrice || 0) / 1000).toFixed(1)}K
                      </span>
                    )}
                  </div>
                )}

                {showActivity && (
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      {workedCollaboratorsCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {activeSuppliersCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {activeMachinesCount}
                    </span>
                    {collaboratorTimeSummaries.length > 0 ? (
                      <div className="ml-1 flex items-center gap-1.5">
                        {collaboratorTimeSummaries.slice(0, 2).map((collab) => (
                          <div key={`small-${collab.id}`} className="flex items-center gap-1">
                            <div className="h-5 w-5 overflow-hidden rounded-full border border-white bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
                              {collab.picture ? (
                                <img
                                  src={collab.picture}
                                  alt={collab.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-slate-700 dark:text-slate-100">
                                  {collab.initials || "?"}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                              {formatHours(collab.hours)}
                            </span>
                          </div>
                        ))}
                        {collaboratorTimeSummaries.length > 2 && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            +{collaboratorTimeSummaries.length - 2}
                          </span>
                        )}
                      </div>
                    ) : activeCollaborators.length > 0 ? (
                      <div className="ml-1 flex -space-x-1">
                        {activeCollaborators.slice(0, 3).map((collab: any) => (
                          <div
                            key={`small-${collab.id}`}
                            className="h-5 w-5 overflow-hidden rounded-full border border-white bg-slate-200 dark:border-slate-700 dark:bg-slate-700"
                          >
                            {collab.picture ? (
                              <img
                                src={collab.picture}
                                alt={collab.fullName || "Collaboratore"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-slate-700 dark:text-slate-100">
                                {collab.initials || "?"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {isFieldVisible("notes") && data.other && (
                  <div className="mb-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {data.other}
                  </div>
                )}

                {isFieldVisible("suppliers") && taskSuppliers.length > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {taskSuppliers
                      .slice(0, 2)
                      .map(
                        (ts) => ts.supplier?.short_name || ts.supplier?.name || "?"
                      )
                      .join(", ")}
                    {taskSuppliers.length > 2 && " ..."}
                  </div>
                )}
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
            <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90%] overflow-scroll !bg-background dark:!bg-muted">
              <DialogHeader className="pr-10">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle>Modifica {data.unique_code}</DialogTitle>
                  <ManagerGuideButton
                    label="Apri guida dettaglio progetto"
                    stepId="offer-details"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                  />
                </div>
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
                preferProjectCoverImage={preferProjectCoverImage}
                onPreferProjectCoverImageChange={persistCoverPreference}
              />
            </DialogContent>
          </Dialog>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate();
            }}
            disabled={isDuplicating}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {isDuplicating ? "Duplicando..." : "Duplica progetto"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleArchive(data);
            }}
            className="flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {data.archived ? "Ripristina progetto" : "Archivia progetto"}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Cancella progetto
          </ContextMenuItem>
        </ContextMenuContent>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler cancellare il progetto <strong>{data.unique_code}</strong>?
              <br />
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Cancellando..." : "Cancella"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContextMenu>
  );
}
