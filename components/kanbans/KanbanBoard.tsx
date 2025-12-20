"use client";
import { useEffect, useState, useRef, useCallback } from "react";
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
import { Plus } from "lucide-react";
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
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

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
}: any) => {
  const router = useRouter();
  const [isMovingTask, setIsMovingTask] = useState(false);
  const [modalCreate, setModalCreate] = useState(false);
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

  const totalPositions = cards.reduce(
    (sum: number, card: any) =>
      sum +
      (card.positions
        ? card.positions.filter((position: string) => position !== "").length
        : 0),
    0
  );

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

  // Check if this is the "Inviata" column in an offer kanban
  const isInviataColumn =
    isOfferKanban &&
    (column.identifier?.toUpperCase().includes("INVIAT") ||
      column.title?.toUpperCase().includes("INVIAT"));

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

  // Sort function based on column type
  const sortCards = (cardsToSort: any[]) => {
    return [...cardsToSort].sort((a: any, b: any) => {
      // For "Inviata" column in offer kanban: sort by sent_date (oldest first)
      if (isInviataColumn) {
        const sentA = a.sent_date || a.sentDate;
        const sentB = b.sent_date || b.sentDate;

        if (!sentA && !sentB) return 0;
        if (!sentA) return 1; // Cards without sent_date go to the end
        if (!sentB) return -1;

        // Oldest first (ascending order)
        return new Date(sentA).getTime() - new Date(sentB).getTime();
      }

      // Default sorting logic
      if (column.identifier.includes("SPED")) {
        return a.unique_code.localeCompare(b.unique_code);
      } else {
        if (a.deliveryDate === null && b.deliveryDate === null) {
          return 0;
        }
        if (a.deliveryDate === null) {
          return 1;
        }
        if (b.deliveryDate === null) {
          return -1;
        }
        return (
          new Date(a.deliveryDate).getTime() -
          new Date(b.deliveryDate).getTime()
        );
      }
    });
  };

  return (
    <div
      key={column.id}
      className="w-72 shrink-0 flex flex-col border p-4 max-h-full"
    >
      <div className="flex flex-row justify-between shrink-0">
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
          {column.title}{" "}
          {(() => {
            const IconComponent = getKanbanIcon(column.icon);
            return <IconComponent className="h-5 w-5" />;
          })()}
        </h2>
        {/* Column stats - different display for offer kanbans */}
        <div className="text-xs">
          {isOfferKanban ? (
            <>
              <p>
                N° offerte: <span className="font-bold">{totalOffers}</span>
              </p>
              <p>
                Valore totale:{" "}
                <span className="font-bold">
                  {(parseFloat(totalColumn) / 1000).toFixed(2)} K
                </span>
              </p>
            </>
          ) : (
            <>
              <p>
                Progetti: <span className="font-bold">{totalTasks}</span>
              </p>
              <p>
                Posizioni: <span className="font-bold">{totalPositions}</span>
              </p>
              <p>
                V.Attuale:{" "}
                <span className="font-bold">
                  {" "}
                  {(parseFloat(totalValue) / 1000).toFixed(2)} K
                </span>
              </p>
              <p>
                V.Totale :{" "}
                <span className="font-bold">
                  {" "}
                  {(parseFloat(totalColumn) / 1000).toFixed(2)} K
                </span>
              </p>
            </>
          )}
        </div>
        {/* Create button - different behavior for offer kanbans */}
        {isCreationColumn &&
          (isOfferKanban ? (
            <button
              className="border p-2 rounded bg-red-600 hover:bg-red-700 text-white cursor-pointer transition-colors"
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
                  className="border p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => setModalCreate(true)}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[50%] max-h-[90%] overflow-scroll">
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
      <div
        className={`flex-1 overflow-y-auto p-1 ${
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
              isInviataColumn ? (
                <OfferMiniCard
                  key={card.id}
                  id={card.id}
                  data={card}
                  onCardClick={onMiniCardClick}
                  domain={domain}
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
  history: Action;
  initialTasks?: any[];
  kanban: any;
  snapshots: any[];
  domain: string;
}

function KanbanBoard({
  name,
  clients,
  products,
  history,
  initialTasks = [],
  kanban,
  snapshots,
  domain,
}: KanbanBoardTypes) {
  const { siteId } = useSiteId(domain);

  const [tasks, setTasks] = useState(() => {
    // Ensure initialTasks is always an array
    return Array.isArray(initialTasks) ? initialTasks : [];
  });

  // Function to refetch tasks from the API
  const refetchTasks = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (siteId) {
        headers["x-site-id"] = siteId;
      }
      const response = await fetch("/api/kanban/tasks", { headers });
      if (response.ok) {
        const data = await response.json();
        // Filter tasks for current kanban
        const kanbanTasks = Array.isArray(data)
          ? data.filter((t: any) => t.kanbanId === kanban?.id)
          : [];
        setTasks(kanbanTasks);
      }
    } catch (error) {
      logger.error("Error refetching tasks:", error);
    }
  }, [siteId, kanban?.id]);

  // 🔄 Subscribe to realtime updates - when another user moves a card, we see it
  useRealtimeKanban(siteId, (payload) => {
    logger.debug("Received realtime update:", payload.eventType);
    // Refetch tasks when we receive an update from another user
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

  // Check if this is an offer kanban
  const isOfferKanban =
    kanban?.is_offer_kanban || kanban?.isOfferKanban || false;

  // Handler for mini card click in offer kanban
  const handleMiniCardClick = useCallback((task: Task) => {
    setSelectedOfferTask(task);
    setShowFollowUpDialog(true);
  }, []);

  // Optimize moveCard function
  const moveCard = async (id: any, column: any, columnName: any) => {
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

      // Update the card with server response data
      const finalTasks = updatedTasks.map((card) => {
        if (card.id === id) {
          return {
            ...card,
            percentStatus:
              responseData.data?.percentStatus || card.percentStatus,
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

  const [areAllTabsClosed, setAreAllTabsClosed] = useState<boolean>(false);

  const closeAllTabs = () => {
    setAreAllTabsClosed(!areAllTabsClosed);
  };

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
      await moveCard(
        pendingMove.cardId,
        pendingMove.columnId,
        pendingMove.columnIdentifier
      );
      setShowMoveConfirm(false);
      setPendingMove(null);
    }
  };

  const handleMoveCancel = () => {
    setShowMoveConfirm(false);
    setPendingMove(null);
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
          <div className="shrink-0 w-full pt-4 pb-2 px-8">
            <h1
              className="text-2xl font-bold mb-4 p-4 rounded-lg"
              style={{
                backgroundColor: kanban.color || "#1e293b",
                color: getContrastColor(kanban.color || "#1e293b"),
              }}
            >
              {kanban.title.toUpperCase()}
            </h1>
            <div className="flex justify-between items-center gap-4 max-w-[1000px]">
              <div
                className={`flex justify-start gap-2 ${
                  isTimelineOpen ? "opacity-0" : "opacity-100"
                } transition-all duration-300`}
              >
                <button
                  className="cursor-pointer hover:underline transition-all duration-300 text-xs border p-2"
                  onClick={closeAllTabs}
                >
                  {areAllTabsClosed
                    ? "Apri tutte le tab"
                    : " Chiudi tutte le tab"}
                </button>

                <button
                  className="cursor-pointer hover:underline transition-all duration-300 text-xs border p-2 "
                  onClick={undoLastMove}
                >
                  Annulla ultima azione
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
            {isTimelineOpen && (
              <div className="max-w-[1000px] mx-auto mt-2">
                <TimelineClient
                  snapshots={snapshots}
                  onPreviewSnapshot={handlePreviewSnapshot}
                />
              </div>
            )}
          </div>
        )}
        {kanban ? (
          <div
            className={`${
              loading ? "opacity-50" : ""
            } transition-all duration-500 flex-1 overflow-auto px-8 pb-4`}
          >
            <div className="flex gap-4 pt-4 min-w-max">
              {(kanban.columns || [])
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((column: KanbanColumn) => {
                  // Ensure tasks is an array before filtering
                  const columnCards = Array.isArray(tasks)
                    ? tasks.filter(
                        (task: Task) =>
                          //@ts-ignore
                          task?.column?.identifier === column.identifier &&
                          task.archived !== true
                      )
                    : [];

                  return (
                    <Column
                      key={column.id}
                      column={column}
                      data={{ clients, products }}
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
        />
      )}
    </DndContext>
  );
}

export default KanbanBoard;
