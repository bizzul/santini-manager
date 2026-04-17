"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  useDroppable,
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  pointerWithin,
} from "@dnd-kit/core";
import Card from "./Card";
import OfferMiniCard from "./OfferMiniCard";
import OfferFollowUpDialog from "./OfferFollowUpDialog";
import OfferQuickAdd from "./OfferQuickAdd";
import DraftCompletionWizard from "./DraftCompletionWizard";
import { Plus, FileEdit, X, RotateCcw, Eraser } from "lucide-react";
import { getKanbanIcon } from "@/lib/kanban-icons";
import { Action, KanbanColumn, Task } from "@/types/supabase";
import { calculateCurrentValue } from "../../package/utils/various/calculateCurrentValue";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import CreateProductForm from "@/app/sites/[domain]/projects/createForm";
import { useToast } from "../ui/use-toast";
import { useSiteId } from "@/hooks/use-site-id";
import { useRealtimeKanban } from "@/hooks/use-realtime-kanban";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { saveState } from "@/app/sites/[domain]/kanban/actions/save-kanban-state.action";
import TimelineClient from "./TimelineClient";
import KanbanManagementModal from "./KanbanManagementModal";
import { saveKanban } from "@/app/sites/[domain]/kanban/actions/save-kanban.action";
import { saveKanbanCardConfig } from "@/app/sites/[domain]/kanban/actions/save-kanban-card-config.action";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  getOfferTrattativaSortPriority,
  OFFER_LOSS_REASON_OPTIONS,
} from "@/lib/offers";
import {
  CARD_FIELD_LABELS,
  DEFAULT_CARD_FIELD_CONFIG,
  type CardDisplayField,
  type CardDisplayMode,
  type CardFieldConfig,
} from "./card-display-config";

const getTaskCategoryIds = (task: any): number[] => {
  const ids = new Set<number>();
  const sellProduct = task?.sellProduct || task?.SellProduct;
  const rawCategory = sellProduct?.category;
  const categories = Array.isArray(rawCategory)
    ? rawCategory
    : rawCategory
      ? [rawCategory]
      : [];

  categories.forEach((category: any) => {
    const categoryId = Number(category?.id);
    if (Number.isFinite(categoryId)) {
      ids.add(categoryId);
    }
  });

  const directCategoryId = Number(
    sellProduct?.category_id ?? sellProduct?.categoryId
  );
  if (Number.isFinite(directCategoryId)) {
    ids.add(directCategoryId);
  }

  const draftCategoryIds = task?.draft_category_ids || task?.draftCategoryIds;
  if (Array.isArray(draftCategoryIds)) {
    draftCategoryIds.forEach((categoryId: any) => {
      const normalizedCategoryId = Number(categoryId);
      if (Number.isFinite(normalizedCategoryId)) {
        ids.add(normalizedCategoryId);
      }
    });
  }

  return Array.from(ids);
};

const normalizeCardFieldConfig = (
  rawConfig: unknown
): CardFieldConfig => {
  const config = (rawConfig ?? {}) as Partial<
    Record<CardDisplayMode, Partial<Record<CardDisplayField, unknown>>>
  >;

  return {
    normal: {
      ...DEFAULT_CARD_FIELD_CONFIG.normal,
      ...Object.fromEntries(
        Object.entries(config.normal || {}).filter(
          ([, value]) => typeof value === "boolean"
        )
      ),
    },
    small: {
      ...DEFAULT_CARD_FIELD_CONFIG.small,
      ...Object.fromEntries(
        Object.entries(config.small || {}).filter(
          ([, value]) => typeof value === "boolean"
        )
      ),
    },
  };
};

const Column = ({
  column,
  data,
  cards,
  moveCard,
  history,
  areAllTabsClosed,
  isPreviewMode,
  kanban,
  domain,
  isOfferKanban,
  onMiniCardClick,
  onTaskCreated,
  onTaskDeleted,
  cardFieldConfig,
}: any) => {
  const router = useRouter();
  const [isMovingTask, setIsMovingTask] = useState(false);
  const [modalCreate, setModalCreate] = useState(false);
  const [modalQuickAdd, setModalQuickAdd] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  const getBaseTaskNumber = (taskTitle: string): string => {
    const match = taskTitle.match(/^\d{2}-\d{3}/);
    return match ? match[0] : taskTitle;
  };

  const groupTasksByBaseNumber = (tasks: Task[]): { [key: string]: Task[] } => {
    return tasks.reduce((acc: { [key: string]: Task[] }, task) => {
      const baseNumber = getBaseTaskNumber(task.unique_code!);
      if (!acc[baseNumber]) {
        acc[baseNumber] = [];
      }
      acc[baseNumber].push(task);
      return acc;
    }, {});
  };

  // Calculate total number of tasks and total value
  const totalTasks = Object.keys(groupTasksByBaseNumber(cards)).length;
  const totalOffers = cards.length; // For offer kanban, count all cards

  const totalValue = cards
    .reduce(
      (total: number, card: any) =>
        total + calculateCurrentValue(card, column.position),
      0
    )
    .toFixed(2);

  const totalColumn = cards
    .reduce((total: number, card: any) => total + (card.sellPrice || 0), 0)
    .toFixed(2);

  // Priorità a numero_pezzi rispetto alle posizioni
  const totalPositions = cards.reduce((sum: number, card: any) => {
    // Se numero_pezzi è definito, usa quello
    if (card.numero_pezzi && card.numero_pezzi > 0) {
      return sum + card.numero_pezzi;
    }
    // Altrimenti conta le posizioni riempite
    return (
      sum +
      (card.positions
        ? card.positions.filter((position: string) => position !== "").length
        : 0)
    );
  }, 0);

  const { isOver, setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: {
      columnId: column.id,
      columnIdentifier: column.identifier,
      columnType: column.column_type || "normal",
      columnTitle: column.title,
    },
    disabled: isPreviewMode,
  });

  useEffect(() => {
    // Simulate a small delay to show loading state
    const timer = setTimeout(() => {
      setIsLoadingCards(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [cards]);

  // Check if this is the "Trattativa" column in an offer kanban (for follow-up dialog)
  const isTrattativaColumn =
    isOfferKanban &&
    (column.identifier?.toUpperCase().includes("TRATTATIV") ||
      column.title?.toUpperCase().includes("TRATTATIV"));

  // Check if this column should show the create button
  // Uses is_creation_column flag, falls back to position === 1 for backwards compatibility
  const hasCreationColumnFlag =
    column.is_creation_column || column.isCreationColumn;
  const isCreationColumn =
    hasCreationColumnFlag ||
    // Fallback: if no column has the flag explicitly set, use first column
    (!kanban?.columns?.some(
      (c: any) => c.is_creation_column || c.isCreationColumn
    ) &&
      column.position === 1);

  // Check if this is the TODO column (first column) for offer kanbans
  // TODO column is used for quick add of draft offers
  const isTodoColumn = column.position === 1 && isOfferKanban;

  const getSortTimestamp = (card: any, fields: string[]) => {
    for (const field of fields) {
      const value = card?.[field];
      if (!value) continue;

      const timestamp = new Date(value).getTime();
      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    return null;
  };

  const compareByDate = (a: any, b: any, fields: string[]) => {
    const timeA = getSortTimestamp(a, fields);
    const timeB = getSortTimestamp(b, fields);

    if (timeA === null && timeB === null) {
      return (
        (a.unique_code || "").localeCompare(b.unique_code || "") ||
        (a.id || 0) - (b.id || 0)
      );
    }

    if (timeA === null) return 1;
    if (timeB === null) return -1;

    return (
      timeA - timeB ||
      (a.unique_code || "").localeCompare(b.unique_code || "") ||
      (a.id || 0) - (b.id || 0)
    );
  };

  // Sort function based on column type
  const sortCards = (cardsToSort: any[]) => {
    return [...cardsToSort].sort((a: any, b: any) => {
      // For "Trattativa": actionable offers first, then active follow-ups.
      if (isTrattativaColumn) {
        const priorityDiff =
          getOfferTrattativaSortPriority(a) - getOfferTrattativaSortPriority(b);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return compareByDate(a, b, ["sent_date", "sentDate"]);
      }

      // Default sorting logic
      if ((column.identifier || "").includes("SPED")) {
        return (
          (a.unique_code || "").localeCompare(b.unique_code || "") ||
          (a.id || 0) - (b.id || 0)
        );
      }

      // Keep all other kanban cards aligned to the visible "Data di posa".
      return compareByDate(a, b, [
        "deliveryDate",
        "delivery_date",
        "termine_produzione",
        "termineProduzione",
      ]);
    });
  };

  const renderStat = (label: string, value: any) => (
    <div className="rounded-md border bg-muted/40 px-2 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold leading-tight">{value}</p>
    </div>
  );

  return (
    <div
      key={column.id}
      className="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-background shadow-sm"
    >
      <div className="shrink-0 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight">
              <span className="truncate">{column.title}</span>
              {(() => {
                const IconComponent = getKanbanIcon(column.icon);
                return <IconComponent className="h-4 w-4 shrink-0" />;
              })()}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Quick Add button for TODO column in offer kanbans */}
            {isTodoColumn && (
              <Dialog
                open={modalQuickAdd}
                onOpenChange={() => setModalQuickAdd(!modalQuickAdd)}
              >
                <DialogTrigger asChild>
                  <button
                    className="cursor-pointer rounded border bg-amber-500 p-2 text-white transition-colors hover:bg-amber-600"
                    onClick={() => setModalQuickAdd(true)}
                    title="Aggiungi richiesta offerta rapida"
                  >
                    <FileEdit className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Nuova Richiesta Offerta</DialogTitle>
                    <DialogDescription>
                      Aggiungi una richiesta rapida in TODO. Potrai completare i
                      dettagli quando lavori l&apos;offerta.
                    </DialogDescription>
                  </DialogHeader>
                  <OfferQuickAdd
                    clients={data.clients || []}
                    categories={data.categories || []}
                    kanbanId={(kanban as any)?.id}
                    domain={domain}
                    onSuccess={() => {
                      setModalQuickAdd(false);
                      if (onTaskCreated) {
                        onTaskCreated();
                      }
                    }}
                    onCancel={() => setModalQuickAdd(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
            {/* Create button - different behavior for offer kanbans */}
            {isCreationColumn &&
              (isOfferKanban ? (
                <button
                  className="cursor-pointer rounded border bg-red-600 p-2 text-white transition-colors hover:bg-red-700"
                  onClick={() =>
                    router.push(
                      `/sites/${domain}/offerte/create?kanbanId=${kanban?.id}`
                    )
                  }
                  title="Crea nuova offerta"
                >
                  <Plus className="h-4 w-4" />
                </button>
              ) : (
                <Dialog
                  open={modalCreate}
                  onOpenChange={() => setModalCreate(!modalCreate)}
                >
                  <DialogTrigger asChild>
                    <button
                      className="cursor-pointer rounded border p-2 hover:bg-accent"
                      onClick={() => setModalCreate(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90%] overflow-scroll">
                    <DialogHeader>
                      <DialogTitle>Crea progetto</DialogTitle>
                      <DialogDescription>Crea un progetto nuovo</DialogDescription>
                    </DialogHeader>
                    <CreateProductForm
                      data={data}
                      handleClose={(success?: boolean) => {
                        setModalCreate(false);
                        if (success && onTaskCreated) {
                          onTaskCreated();
                        }
                      }}
                      kanbanId={(kanban as any)?.id}
                      domain={domain}
                    />
                  </DialogContent>
                </Dialog>
              ))}
          </div>
        </div>
        {/* Column stats - different display for offer kanbans */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {isOfferKanban ? (
            <>
              {renderStat("Offerte", totalOffers)}
              {renderStat(
                "Valore",
                `${(parseFloat(totalColumn) / 1000).toFixed(2)} K`
              )}
            </>
          ) : (
            <>
              {renderStat("Progetti", totalTasks)}
              {renderStat("Posizioni", totalPositions)}
              {renderStat(
                "V. attuale",
                `${(parseFloat(totalValue) / 1000).toFixed(2)} K`
              )}
              {renderStat(
                "V. totale",
                `${(parseFloat(totalColumn) / 1000).toFixed(2)} K`
              )}
            </>
          )}
        </div>
      </div>
      <div
        className={`flex-1 min-h-0 overflow-y-auto px-3 py-3 ${
          isOver && !isPreviewMode ? "bg-green-500 border border-zinc-400" : ""
        }`}
        ref={setNodeRef}
      >
        {isLoadingCards
          ? // Loading skeletons for cards
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="mb-4">
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            ))
          : sortCards(cards).map((card: any) =>
              isTrattativaColumn ? (
                <OfferMiniCard
                  key={card.id}
                  id={card.id}
                  data={card}
                  onCardClick={onMiniCardClick}
                  domain={domain}
                  onTaskDeleted={onTaskDeleted}
                />
              ) : (
                <Card
                  key={card.id}
                  id={card.id}
                  title={card.title}
                  data={card}
                  columnIndex={column.position}
                  history={history}
                  isSmall={areAllTabsClosed}
                  domain={domain}
                  onTaskDeleted={onTaskDeleted}
                  cardFieldConfig={cardFieldConfig}
                />
              )
            )}
      </div>
    </div>
  );
};

interface KanbanBoardTypes {
  name: any;
  clients: any;
  products: any;
  categories: any;
  history: Action;
  initialTasks?: any[];
  kanban: any;
  domain: string;
}

function KanbanBoard({
  name,
  clients,
  products,
  categories,
  history,
  initialTasks = [],
  kanban,
  domain,
}: KanbanBoardTypes) {
  const router = useRouter();
  const { siteId } = useSiteId(domain);
  const safeCategories = Array.isArray(categories) ? categories : [];
  const shouldPersistCardConfigLocally =
    process.env.NEXT_PUBLIC_ENABLE_CARD_PREFS === "true";

  const [tasks, setTasks] = useState(() => {
    // Ensure initialTasks is always an array
    return Array.isArray(initialTasks) ? initialTasks : [];
  });
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [allCategoriesSelected, setAllCategoriesSelected] = useState(true);
  const [cardFieldConfig, setCardFieldConfig] = useState<CardFieldConfig>(() =>
    normalizeCardFieldConfig(
      kanban?.card_field_config || kanban?.cardFieldConfig || DEFAULT_CARD_FIELD_CONFIG
    )
  );
  const [isCardConfigDialogOpen, setIsCardConfigDialogOpen] = useState(false);
  const [draftCardFieldConfig, setDraftCardFieldConfig] =
    useState<CardFieldConfig>(DEFAULT_CARD_FIELD_CONFIG);

  const sortedColumns = useMemo(
    () =>
      [...(kanban?.columns || [])].sort(
        (a: any, b: any) => (a.position || 0) - (b.position || 0)
      ),
    [kanban?.columns]
  );

  const boardColumnsWidthRem = useMemo(() => {
    const count = sortedColumns.length;
    if (count <= 0) return 72;
    return count * 18 + (count - 1) * 1;
  }, [sortedColumns.length]);

  // Sync tasks state when kanban changes (e.g., user clicks on a different kanban)
  // This is needed because useState only uses the initial value on first render
  useEffect(() => {
    if (Array.isArray(initialTasks)) {
      setTasks(initialTasks);
    } else {
      setTasks([]);
    }
  }, [kanban?.id]); // Reset when kanban changes

  // Function to refetch tasks from the API
  const refetchTasks = useCallback(async () => {
    try {
      if (!kanban?.id) {
        safeSetTasks([]);
        return;
      }

      const headers: HeadersInit = {};
      if (siteId) {
        headers["x-site-id"] = siteId;
      }

      const response = await fetch(`/api/kanban/tasks?kanbanId=${kanban.id}`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        safeSetTasks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.error("Error refetching tasks:", error);
    }
  }, [siteId, kanban?.id]);

  // 🔄 Subscribe to realtime updates - when another user moves a card, we see it
  useRealtimeKanban(siteId, (payload) => {
    const currentKanbanId = Number(kanban?.id);
    const affectedKanbanIds = [payload.new?.kanbanId, payload.old?.kanbanId]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (
      Number.isFinite(currentKanbanId) &&
      affectedKanbanIds.length > 0 &&
      !affectedKanbanIds.includes(currentKanbanId)
    ) {
      return;
    }

    logger.debug("Received realtime update:", payload.eventType);
    refetchTasks();
  });
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [setEditModalOpen] = useState<boolean>(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<{
    card: any;
    from: any;
    to: any;
  } | null>(null);

  // State for move confirmation (IMBALLAGGIO and special columns)
  const [showMoveConfirm, setShowMoveConfirm] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    cardId: number;
    columnId: number;
    columnIdentifier: string;
    columnType: string;
    columnTitle: string;
    confirmationType:
      | "imballaggio"
      | "won"
      | "lost"
      | "production"
      | "invoicing";
  } | null>(null);

  // State for offer follow-up dialog
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [selectedOfferTask, setSelectedOfferTask] = useState<Task | null>(null);
  const [lostReason, setLostReason] = useState<string>("");
  const [lostCompetitorName, setLostCompetitorName] = useState<string>("");
  const [useCustomCompetitor, setUseCustomCompetitor] = useState(false);
  const [competitorSuggestions, setCompetitorSuggestions] = useState<string[]>([]);

  // State for draft completion dialog
  const [showDraftCompletion, setShowDraftCompletion] = useState(false);
  const [draftTask, setDraftTask] = useState<Task | null>(null);
  const [draftTargetColumn, setDraftTargetColumn] = useState<{
    id: number;
    identifier: string;
  } | null>(null);

  // Check if this is an offer kanban
  const isOfferKanban =
    kanban?.is_offer_kanban || kanban?.isOfferKanban || false;

  const cardFieldStorageKey = useRef<string | null>(null);

  const updateTaskInState = useCallback((updatedTask: any) => {
    if (!updatedTask?.id) return;
    safeSetTasks(
      tasks.map((task) =>
        task.id === updatedTask.id
          ? {
              ...task,
              ...updatedTask,
              column: updatedTask.kanban_columns || task.column,
            }
          : task
      )
    );
    if (selectedOfferTask?.id === updatedTask.id) {
      setSelectedOfferTask((current) =>
        current ? { ...current, ...updatedTask } : current
      );
    }
  }, [tasks, selectedOfferTask]);

  // Handler for mini card click in offer kanban
  const handleMiniCardClick = useCallback((task: Task) => {
    setSelectedOfferTask(task);
    setShowFollowUpDialog(true);
  }, []);

  useEffect(() => {
    if (!showMoveConfirm || pendingMove?.confirmationType !== "lost") {
      return;
    }

    const loadCompetitors = async () => {
      try {
        const headers: HeadersInit = {};
        if (siteId) {
          headers["x-site-id"] = siteId;
        }
        const response = await fetch("/api/competitors", { headers });
        if (!response.ok) return;
        const data = await response.json();
        const suggestions = Array.isArray(data?.competitors) ? data.competitors : [];
        setCompetitorSuggestions(suggestions);
        setUseCustomCompetitor(suggestions.length === 0);
      } catch (error) {
        logger.error("Error loading competitors:", error);
      }
    };

    loadCompetitors();
  }, [showMoveConfirm, pendingMove, siteId]);

  // Optimize moveCard function
  const moveCard = async (
    id: any,
    column: any,
    columnName: any,
    extraData?: {
      lossReason?: string;
      lossCompetitorName?: string;
    }
  ) => {
    const isPreviewMode =
      tasks?.length > 0 && tasks.some((task) => task.isPreview);
    if (isPreviewMode) {
      toast({
        variant: "destructive",
        title: "Modalità anteprima",
        description:
          "Non puoi spostare le card mentre sei in modalità anteprima. Rimuovi l'anteprima prima.",
      });
      return;
    }

    setLoading(true);
    try {
      // Optimistically update the UI
      if (!Array.isArray(tasks)) {
        logger.error("Tasks is not an array:", tasks);
        throw new Error("Tasks data is not available");
      }

      const updatedTasks = tasks.map((card) => {
        if (card.id === id) {
          const previousColumn = card.column;
          const previousColumnName = card.column?.identifier;
          setLastAction({
            card: { ...card },
            from: { id: previousColumn?.id, name: previousColumnName },
            to: { id: column, name: columnName },
          });

          return {
            ...card,
            kanbanColumnId: column,
            column: { id: column, identifier: columnName },
          };
        }
        return card;
      });

      safeSetTasks(updatedTasks);

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add site_id header if available
      if (siteId) {
        headers["x-site-id"] = siteId;
      }

      const response = await fetch("/api/kanban/tasks/move", {
        method: "POST",
        body: JSON.stringify({
          id: id,
          column: column,
          columnName: columnName,
          ...extraData,
        }),
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error("Move card error:", errorData);
        throw new Error(
          `Failed to move card: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const responseData = await response.json();

      // Update the card with ALL server response data to ensure persistence
      // This is critical for maintaining data consistency after moves
      const finalTasks = updatedTasks.map((card) => {
        if (card.id === id && responseData.data) {
          // Merge all server response data with local card data
          // Server data takes precedence for persisted fields
          return {
            ...card,
            ...responseData.data,
            // Ensure column object is properly set
            column: responseData.data.kanban_columns || card.column,
            // Keep the kanbanColumnId in sync
            kanbanColumnId: responseData.data.kanbanColumnId || column,
          };
        }
        return card;
      });

      safeSetTasks(finalTasks);

      if (responseData.qc?.length > 0 && responseData.pc?.length > 0) {
        toast({
          description: `QC e Packing creati`,
        });
      } else {
        toast({
          description: `Progetto spostato correttamente`,
        });
      }

      // Save state after successful move
      await saveState();
    } catch (error) {
      console.error("Error moving card:", error);
      // Revert optimistic update on error
      if (lastAction && Array.isArray(tasks)) {
        const revertedTasks = tasks.map((card) => {
          if (card.id === id) {
            return {
              ...card,
              kanbanColumnId: lastAction.from.id,
              column: { id: lastAction.from.id, name: lastAction.from.name },
            };
          }
          return card;
        });
        safeSetTasks(revertedTasks);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        variant: "destructive",
        title: "Errore",
        description: `Impossibile spostare la card: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewSnapshot = async (timestamp: Date | null) => {
    if (!timestamp) {
      // Reset to original state - reload page to get fresh data
      window.location.reload();
      return;
    }

    try {
      const response = await fetch(
        `/api/kanban/snapshot?timestamp=${timestamp.toISOString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch snapshot");
      }

      const snapshotTasks = await response.json();

      // Ensure snapshotTasks is an array
      if (Array.isArray(snapshotTasks)) {
        safeSetTasks(snapshotTasks);
        toast({
          title: "Anteprima modalità",
          description:
            "Stato kanban al " + new Date(timestamp).toLocaleString(),
        });
      } else {
        safeSetTasks([]);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Formato dati non valido",
        });
      }
    } catch (error) {
      logger.error("Error fetching snapshot:", error);
      safeSetTasks([]); // Set empty array on error
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Caricamento stato fallito",
      });
    }
  };

  // null = non ancora attivato (usa default/localStorage)
  // true = "Chiudi tutte le tab" attivo
  // false = "Apri tutte le tab" attivo
  const [areAllTabsClosed, setAreAllTabsClosed] = useState<boolean | null>(null);

  const closeAllTabs = () => {
    // Toggle: null -> true -> false -> true -> false...
    if (areAllTabsClosed === null || areAllTabsClosed === false) {
      setAreAllTabsClosed(true);
    } else {
      setAreAllTabsClosed(false);
    }
  };

  // Determina il testo del pulsante
  const isTabsToggleActive = areAllTabsClosed !== null;
  const showOpenAllText = areAllTabsClosed === true;

  // REMOVED: Duplicate polling system - using the optimized checkForUpdates system instead

  const undoLastMove = () => {
    if (lastAction) {
      // Call your moveCard function to move the card back to its original column
      moveCard(lastAction.card.id, lastAction.from.id, lastAction.from.name);
    }
  };

  const isPreviewMode =
    initialTasks?.length > 0 && initialTasks.some((task) => task.isPreview);

  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<
    { timestamp: Date; taskCount: number }[]
  >([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [hasLoadedSnapshots, setHasLoadedSnapshots] = useState(false);
  const isSomeCategoriesSelected =
    selectedCategories.length > 0 && !allCategoriesSelected;

  const handleCategoryToggle = useCallback((categoryId: number) => {
    setAllCategoriesSelected(false);
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }

      return [...prev, categoryId];
    });
  }, []);

  const handleSelectAllCategories = useCallback(
    (checked: boolean) => {
      setAllCategoriesSelected(checked);
      setSelectedCategories(checked ? [] : safeCategories.map((cat) => cat.id));
    },
    [safeCategories]
  );

  const filteredTasks = Array.isArray(tasks)
    ? tasks.filter((task: any) => {
        if (allCategoriesSelected) {
          return true;
        }

        if (selectedCategories.length === 0) {
          return false;
        }

        const taskCategoryIds = getTaskCategoryIds(task);
        return taskCategoryIds.some((categoryId) =>
          selectedCategories.includes(categoryId)
        );
      })
    : [];

  useEffect(() => {
    setSnapshots([]);
    setHasLoadedSnapshots(false);
    setIsTimelineOpen(false);
  }, [siteId]);

  useEffect(() => {
    if (!isTimelineOpen || !siteId || hasLoadedSnapshots) {
      return;
    }

    let isCancelled = false;

    const loadSnapshots = async () => {
      try {
        setIsLoadingSnapshots(true);
        const response = await fetch("/api/kanban/available-snapshots", {
          headers: {
            "x-site-id": siteId,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch snapshots");
        }

        const data = await response.json();
        if (!isCancelled) {
          setSnapshots(
            Array.isArray(data)
              ? data.map((snapshot) => ({
                  ...snapshot,
                  timestamp: new Date(snapshot.timestamp),
                }))
              : []
          );
          setHasLoadedSnapshots(true);
        }
      } catch (error) {
        logger.error("Error fetching snapshots:", error);
        if (!isCancelled) {
          setSnapshots([]);
          toast({
            variant: "destructive",
            title: "Errore",
            description: "Impossibile caricare la timeline del kanban",
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSnapshots(false);
        }
      }
    };

    void loadSnapshots();

    return () => {
      isCancelled = true;
    };
  }, [hasLoadedSnapshots, isTimelineOpen, siteId, toast]);

  useEffect(() => {
    const key = kanban?.id ? `kanban-card-fields-${kanban.id}` : null;
    cardFieldStorageKey.current = key;

    const serverConfig = normalizeCardFieldConfig(
      kanban?.card_field_config || kanban?.cardFieldConfig || DEFAULT_CARD_FIELD_CONFIG
    );

    if (!key) {
      setCardFieldConfig(serverConfig);
      return;
    }

    if (shouldPersistCardConfigLocally) {
      try {
        const savedConfig = localStorage.getItem(key);
        if (!savedConfig) {
          setCardFieldConfig(serverConfig);
          return;
        }

        const parsed = JSON.parse(savedConfig);
        setCardFieldConfig(normalizeCardFieldConfig(parsed));
      } catch (error) {
        logger.warn("Error loading card field config:", error);
        setCardFieldConfig(serverConfig);
      }
      return;
    }

    setCardFieldConfig(serverConfig);
  }, [
    kanban?.id,
    kanban?.card_field_config,
    kanban?.cardFieldConfig,
    shouldPersistCardConfigLocally,
  ]);

  const toggleCardField = useCallback(
    (mode: CardDisplayMode, field: CardDisplayField) => {
      setDraftCardFieldConfig((current) => ({
        ...current,
        [mode]: {
          ...current[mode],
          [field]: !current[mode][field],
        },
      }));
    },
    []
  );

  const openCardConfigDialog = useCallback(() => {
    setDraftCardFieldConfig({
      normal: { ...cardFieldConfig.normal },
      small: { ...cardFieldConfig.small },
    });
    setIsCardConfigDialogOpen(true);
  }, [cardFieldConfig]);

  const saveCardConfig = useCallback(async () => {
    const normalizedConfig = normalizeCardFieldConfig(draftCardFieldConfig);
    setCardFieldConfig(normalizedConfig);
    const key = cardFieldStorageKey.current;
    if (key && shouldPersistCardConfigLocally) {
      try {
        localStorage.setItem(key, JSON.stringify(normalizedConfig));
      } catch (error) {
        logger.warn("Error saving card field config:", error);
      }
    }

    if (kanban?.id) {
      const result = await saveKanbanCardConfig(kanban.id, normalizedConfig, domain);
      if (!result.success) {
        toast({
          variant: "destructive",
          description:
            "Configurazione salvata solo in locale. Errore sync online: " +
            (result.error || "sconosciuto"),
        });
      }
    }

    setIsCardConfigDialogOpen(false);
    toast({
      description: "Preferenze card progetto salvate.",
    });
  }, [draftCardFieldConfig, toast, kanban?.id, domain, shouldPersistCardConfigLocally]);

  const resetKanbanPreferences = useCallback(() => {
    try {
      if (typeof window === "undefined") return;
      const prefixesToRemove = [
        "isSmall-",
        "card-cover-preference-",
        "kanban-card-fields-",
      ];
      const keysToRemove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const storageKey = window.localStorage.key(index);
        if (!storageKey) continue;
        if (prefixesToRemove.some((prefix) => storageKey.startsWith(prefix))) {
          keysToRemove.push(storageKey);
        }
      }
      keysToRemove.forEach((storageKey) =>
        window.localStorage.removeItem(storageKey)
      );
      toast({
        description:
          keysToRemove.length > 0
            ? `Reset preferenze kanban completato (${keysToRemove.length} chiavi rimosse). Ricarico...`
            : "Nessuna preferenza kanban in locale. Ricarico per sicurezza...",
      });
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (error) {
      logger.warn("Error resetting kanban preferences:", error);
      toast({
        variant: "destructive",
        description: "Errore durante il reset preferenze kanban.",
      });
    }
  }, [toast]);

  const handleSaveKanban = async (kanbanData: any) => {
    try {
      // Use the domain passed as prop instead of window.location.hostname
      await saveKanban(kanbanData, domain);
      // Refresh the page to get the updated kanban data
      window.location.reload();
    } catch (error) {
      console.error("Error saving kanban:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description:
          "Si è verificato un errore durante il salvataggio del kanban",
      });
    }
  };

  // Safe setTasks function that ensures tasks is always an array
  const safeSetTasks = (newTasks: any) => {
    if (Array.isArray(newTasks)) {
      setTasks(newTasks);
    } else {
      logger.warn("Attempted to set non-array tasks:", newTasks);
      setTasks([]);
    }
  };

  // Configure sensors for mouse and touch
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const cardId = parseInt(active.id as string);
    const activeData = active.data.current;
    const overData = over.data.current;

    // Extract column info from droppable
    const columnId = overData?.columnId;
    const columnIdentifier = overData?.columnIdentifier;
    const columnType = overData?.columnType || "normal";
    const columnTitle = overData?.columnTitle || columnIdentifier;

    if (!columnId || !columnIdentifier) return;

    // Skip if card is already in this column
    if (activeData?.fromColumn === columnIdentifier) return;

    // Check if this is a draft being moved out of TODO (first column)
    const task = tasks.find((t) => t.id === cardId);
    const isDraft = task?.is_draft || task?.isDraft;
    const isMovingFromFirstColumn = activeData?.fromColumnPosition === 1;

    if (isDraft && isOfferKanban && isMovingFromFirstColumn) {
      // Show draft completion dialog instead of redirecting
      setDraftTask(task);
      setDraftTargetColumn({ id: columnId, identifier: columnIdentifier });
      setShowDraftCompletion(true);
      return;
    }

    // Check if moving to special columns - show confirmation
    const specialColumnTypes = ["won", "lost", "production", "invoicing"];
    const isSpecialColumn = specialColumnTypes.includes(columnType);
    const isImballaggio =
      columnIdentifier.includes("IMBALL") ||
      activeData?.fromColumn?.includes("IMBALL");

    if (isSpecialColumn) {
      setPendingMove({
        cardId,
        columnId,
        columnIdentifier,
        columnType,
        columnTitle,
        confirmationType: columnType as
          | "won"
          | "lost"
          | "production"
          | "invoicing",
      });
      setShowMoveConfirm(true);
      return;
    }

    if (isImballaggio) {
      setPendingMove({
        cardId,
        columnId,
        columnIdentifier,
        columnType,
        columnTitle,
        confirmationType: "imballaggio",
      });
      setShowMoveConfirm(true);
      return;
    }

    // Otherwise proceed with move
    await moveCard(cardId, columnId, columnIdentifier);
  };

  // Handle move confirmation
  const handleMoveConfirm = async () => {
    if (pendingMove) {
      if (pendingMove.confirmationType === "lost" && !lostReason) {
        toast({
          variant: "destructive",
          title: "Motivazione richiesta",
          description: "Seleziona la motivazione della perdita prima di continuare.",
        });
        return;
      }

      await moveCard(
        pendingMove.cardId,
        pendingMove.columnId,
        pendingMove.columnIdentifier,
        pendingMove.confirmationType === "lost"
          ? {
              lossReason: lostReason,
              lossCompetitorName: lostCompetitorName,
            }
          : undefined
      );
      setShowMoveConfirm(false);
      setPendingMove(null);
      setLostReason("");
      setLostCompetitorName("");
      setUseCustomCompetitor(false);
    }
  };

  const handleMoveCancel = () => {
    setShowMoveConfirm(false);
    setPendingMove(null);
    setLostReason("");
    setLostCompetitorName("");
    setUseCustomCompetitor(false);
  };

  // Get confirmation message based on type
  const getConfirmationMessage = () => {
    if (!pendingMove) return { title: "", description: "" };

    switch (pendingMove.confirmationType) {
      case "won":
        return {
          title: "🎉 Conferma Offerta Vinta",
          description: `Stai per spostare questo progetto in "${pendingMove.columnTitle}". L'offerta verrà marcata come vinta e verrà creata una copia nella kanban avor.`,
        };
      case "lost":
        return {
          title: "❌ Conferma Offerta Persa",
          description: `Stai per spostare questo progetto in "${pendingMove.columnTitle}". L'offerta verrà marcata come persa e sarà archiviata automaticamente.`,
        };
      case "production":
        return {
          title: "🔧 Conferma Invio a Produzione",
          description: `Stai per spostare questo progetto in "${pendingMove.columnTitle}". Il progetto verrà trasferito nella kanban di produzione corrispondente al tipo di prodotto.`,
        };
      case "invoicing":
        return {
          title: "📄 Conferma Fatturazione",
          description: `Stai per spostare questo progetto in "${pendingMove.columnTitle}". Il progetto verrà trasferito nella kanban fatture e verrà generato un nuovo codice fattura.`,
        };
      case "imballaggio":
        return {
          title: "📦 Conferma Spostamento Imballaggio",
          description: `Stai per spostare questo elemento in "${pendingMove.columnTitle}".`,
        };
      default:
        return {
          title: "Conferma Spostamento",
          description: `Stai per spostare questo progetto in "${pendingMove.columnTitle}".`,
        };
    }
  };

  // Function to determine if text should be black or white based on background color
  const getContrastColor = (hexColor: string): string => {
    // Default to white if no color provided
    if (!hexColor) return "#ffffff";

    // Remove # if present
    const hex = hexColor.replace("#", "");

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate relative luminance using WCAG formula
    // https://www.w3.org/TR/WCAG20-TECHS/G17.html
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {kanban && (
          <div className="shrink-0 w-full pt-4 pb-2 px-8 overflow-x-auto">
            <div style={{ width: `${boardColumnsWidthRem}rem` }} className="min-w-max">
              <div
                className="text-2xl font-bold mb-4 p-4 rounded-lg flex items-center gap-3 shadow-md"
                style={{
                  backgroundColor: kanban.color || "#1e293b",
                  color: getContrastColor(kanban.color || "#1e293b"),
                }}
              >
                {(() => {
                  const IconComponent = getKanbanIcon(kanban.icon);
                  return (
                    <IconComponent
                      className="h-6 w-6 shrink-0"
                      style={{
                        color: getContrastColor(kanban.color || "#1e293b"),
                      }}
                    />
                  );
                })()}
                <span>{kanban.title.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center gap-4 w-full">
              <div
                className={`flex justify-start gap-2 ${
                  isTimelineOpen ? "opacity-0" : "opacity-100"
                } transition-all duration-300`}
              >
                <button
                  className="group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={closeAllTabs}
                  title={
                    showOpenAllText
                      ? "Apri tutte le tab"
                      : "Chiudi tutte le tab"
                  }
                >
                  <X className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span>
                    {showOpenAllText
                      ? "Apri tutte le tab"
                      : "Chiudi tutte le tab"}
                  </span>
                </button>

                <button
                  className="group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={undoLastMove}
                  disabled={!lastAction}
                  title="Annulla ultima azione"
                >
                  <RotateCcw className="h-4 w-4 transition-transform group-hover:rotate-180" />
                  <span>Annulla ultima azione</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <KanbanManagementModal
                  kanban={kanban}
                  onSave={handleSaveKanban}
                  mode="edit"
                  hasTasks={tasks.length > 0}
                  domain={domain}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-background hover:bg-accent"
                    >
                      Modifica Kanban
                    </Button>
                  }
                />
                <h4
                  className={`text-foreground text-sm font-semibold cursor-pointer hover:underline transition-all duration-300 ${
                    isTimelineOpen ? "opacity-50" : "opacity-100"
                  }`}
                  onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                >
                  Time machine
                </h4>
              </div>
              </div>
              <div className="mt-4 rounded-lg border bg-background/80 px-4 py-3 shadow-sm">
                <div className="flex items-start gap-4">
                  {safeCategories.length > 0 ? (
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 pr-2">
                      <span className="text-sm font-medium">Categoria:</span>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="all-project-types"
                            checked={
                              isSomeCategoriesSelected
                                ? "indeterminate"
                                : allCategoriesSelected
                            }
                            onCheckedChange={(checked) =>
                              handleSelectAllCategories(checked === true)
                            }
                          />
                          <Label
                            htmlFor="all-project-types"
                            className="cursor-pointer text-sm font-normal"
                          >
                            Tutte le categorie
                          </Label>
                        </div>
                        {safeCategories.map((category) => {
                          const isSelected = selectedCategories.includes(category.id);

                          return (
                            <div
                              key={category.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`project-type-${category.id}`}
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleCategoryToggle(category.id)
                                }
                              />
                              <Label
                                htmlFor={`project-type-${category.id}`}
                                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                              >
                                {category.color && (
                                  <span
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                )}
                                {category.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Categorie non configurate</div>
                  )}

                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetKanbanPreferences}
                      className="text-xs"
                      title="Reset preferenze locali kanban (isSmall, cover, configurazione campi card)"
                    >
                      <Eraser className="mr-2 h-3.5 w-3.5" />
                      Reset preferenze
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openCardConfigDialog}
                      className="text-xs"
                    >
                      <FileEdit className="mr-2 h-3.5 w-3.5" />
                      Configura campi card
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Dialog open={isCardConfigDialogOpen} onOpenChange={setIsCardConfigDialogOpen}>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Configurazione Card Progetto</DialogTitle>
                  <DialogDescription>
                    Modifica i campi visibili nella versione estesa/ridotta delle card.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {(["normal", "small"] as CardDisplayMode[]).map((mode) => (
                    <div key={mode} className="space-y-2 rounded-md border p-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">
                        {mode === "normal" ? "Versione estesa" : "Versione ridotta"}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(CARD_FIELD_LABELS) as CardDisplayField[]).map((field) => {
                          const checked = draftCardFieldConfig[mode][field];
                          return (
                            <button
                              key={`${mode}-${field}`}
                              type="button"
                              onClick={() => toggleCardField(mode, field)}
                              className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                                checked
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                  : "border-slate-300 bg-background text-slate-500 dark:border-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {CARD_FIELD_LABELS[field]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCardConfigDialogOpen(false)}
                    >
                      Annulla
                    </Button>
                    <Button type="button" onClick={saveCardConfig}>
                      Salva configurazione
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {isTimelineOpen && (
              <div className="w-full mt-2">
                {isLoadingSnapshots ? (
                  <div className="text-sm text-muted-foreground px-2 py-3">
                    Caricamento timeline...
                  </div>
                ) : snapshots.length > 0 ? (
                  <TimelineClient
                    snapshots={snapshots}
                    onPreviewSnapshot={handlePreviewSnapshot}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground px-2 py-3">
                    Nessuno snapshot disponibile per questo kanban.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {kanban ? (
          <div
            className={`${
              loading ? "opacity-50" : ""
            } flex-1 overflow-x-auto overflow-y-hidden px-8 py-4 transition-all duration-500`}
          >
            <div
              className="flex h-full min-h-0 min-w-max items-stretch gap-4"
              style={{ width: `${boardColumnsWidthRem}rem` }}
            >
              {sortedColumns.map((column: KanbanColumn) => {
                  // Ensure tasks is an array before filtering
                  const columnCards = Array.isArray(filteredTasks)
                    ? filteredTasks.filter(
                        (task: Task) =>
                          // @ts-expect-error Task is enriched with joined column data at runtime.
                          task?.column?.identifier === column.identifier &&
                          task.archived !== true
                      )
                    : [];

                  return (
                    <Column
                      key={column.id}
                      column={column}
                      data={{ clients, products, categories }}
                      cards={columnCards}
                      moveCard={moveCard}
                      openModal={openModal}
                      setOpenModal={setOpenModal}
                      setEditModalOpen={setEditModalOpen}
                      history={history}
                      areAllTabsClosed={areAllTabsClosed}
                      isPreviewMode={isPreviewMode}
                      kanban={kanban}
                      domain={domain}
                      isOfferKanban={isOfferKanban}
                      onMiniCardClick={handleMiniCardClick}
                      onTaskCreated={refetchTasks}
                      onTaskDeleted={refetchTasks}
                      cardFieldConfig={cardFieldConfig}
                    />
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <h1 className="font-bold text-2xl mb-2">
                Nessuna Board {name} impostata!
              </h1>
              <p className="mb-4">
                Seleziona un kanban esistente dal menu laterale o creane uno
                nuovo
              </p>
              <KanbanManagementModal
                kanban={null}
                onSave={handleSaveKanban}
                mode="create"
                hasTasks={false}
                domain={domain}
                trigger={
                  <Button variant="default" size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Nuovo Kanban
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Move Confirmation Dialog */}
      <AlertDialog open={showMoveConfirm} onOpenChange={setShowMoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {getConfirmationMessage().title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationMessage().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingMove?.confirmationType === "lost" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivazione</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                >
                  <option value="">Seleziona motivazione...</option>
                  {OFFER_LOSS_REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Competitor
                </label>
                {competitorSuggestions.length > 0 && (
                  <Select
                    value={useCustomCompetitor ? "__custom__" : lostCompetitorName || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__custom__") {
                        setUseCustomCompetitor(true);
                        setLostCompetitorName("");
                        return;
                      }
                      if (value === "__none__") {
                        setUseCustomCompetitor(false);
                        setLostCompetitorName("");
                        return;
                      }
                      setUseCustomCompetitor(false);
                      setLostCompetitorName(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona competitor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessun competitor</SelectItem>
                      {competitorSuggestions.map((competitor) => (
                        <SelectItem key={competitor} value={competitor}>
                          {competitor}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Inserisci competitor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {(useCustomCompetitor || competitorSuggestions.length === 0) && (
                  <Input
                    value={lostCompetitorName}
                    onChange={(e) => setLostCompetitorName(e.target.value)}
                    placeholder="Inserisci il competitor se non presente in elenco"
                  />
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleMoveCancel}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveConfirm}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offer Follow-up Dialog */}
      {isOfferKanban && (
        <OfferFollowUpDialog
          open={showFollowUpDialog}
          onOpenChange={setShowFollowUpDialog}
          task={selectedOfferTask}
          columns={kanban?.columns || []}
          onMoveCard={async (taskId, columnId, columnIdentifier) => {
            await moveCard(taskId, columnId, columnIdentifier);
            // Refetch tasks to update the sent_date if needed
            await refetchTasks();
          }}
          domain={domain}
          onTaskUpdated={updateTaskInState}
        />
      )}

      {/* Draft Completion Dialog */}
      {isOfferKanban && (
        <DraftCompletionWizard
          open={showDraftCompletion}
          onOpenChange={(open) => {
            setShowDraftCompletion(open);
            if (!open) {
              setDraftTask(null);
              setDraftTargetColumn(null);
            }
          }}
          task={draftTask}
          clients={clients}
          products={products}
          categories={categories}
          targetColumnId={draftTargetColumn?.id || 0}
          targetColumnIdentifier={draftTargetColumn?.identifier || ""}
          onComplete={async (taskId, columnId, columnIdentifier) => {
            await moveCard(taskId, columnId, columnIdentifier);
            await refetchTasks();
            setShowDraftCompletion(false);
            setDraftTask(null);
            setDraftTargetColumn(null);
          }}
          domain={domain}
        />
      )}
    </DndContext>
  );
}

export default KanbanBoard;
