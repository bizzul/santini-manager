"use client";
import { useEffect, useState, useRef } from "react";
import { useDrop } from "react-dnd";
import Card from "./Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faPlay,
  faHammer,
  faBox,
  faTruck,
  faClock,
  faTools,
  faScrewdriverWrench,
  faScrewdriver,
  faRuler,
  faRulerCombined,
  faRulerVertical,
  faRulerHorizontal,
  faToolbox,
  faCubes,
  faCouch,
  faChair,
  faTree,
  faLayerGroup,
  faClipboardCheck,
  faBoxesStacked,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { Action, KanbanColumn, Task } from "@prisma/client";
import { calculateCurrentValue } from "../../package/utils/various/calculateCurrentValue";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import CreateProductForm from "@/app/sites/[domain]/kanban/createForm";
import { useToast } from "../ui/use-toast";
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

const iconMap = {
  faCheck,
  faPlay,
  faHammer,
  faBox,
  faTruck,
  faClock,
  faTools,
  faScrewdriverWrench,
  faScrewdriver,
  faRuler,
  faRulerCombined,
  faRulerVertical,
  faRulerHorizontal,
  faToolbox,
  faCubes,
  faCouch,
  faChair,
  faTree,
  faLayerGroup,
  faClipboardCheck,
  faBoxesStacked,
};

const Column = ({
  column,
  data,
  cards,
  moveCard,
  history,
  areAllTabsClosed,
  isPreviewMode,
}: any) => {
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

  const totalValue = cards
    .reduce(
      (total: number, card: any) =>
        total + calculateCurrentValue(card, column.position),
      0
    )
    .toFixed(2);

  const totalColumn = cards
    .reduce((total: number, card: any) => total + card.sellPrice, 0)
    .toFixed(2);

  const totalPositions = cards.reduce(
    (sum: number, card: any) =>
      sum +
      (card.positions
        ? card.positions.filter((position: string) => position !== "").length
        : 0),
    0
  );

  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    id: number;
    toColumn: any;
  } | null>(null);

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      // The type (or types) to accept - strings or symbols
      accept: "card",
      // Props to collect
      drop: async (item: any) => {
        if (isMovingTask || isPreviewMode) {
          return;
        }

        // Check if moving to or from IMBALLAGGIO
        if (
          column.identifier.includes("IMBALL") ||
          item.fromColumn.includes("IMBALL")
        ) {
          setShowMoveConfirmation(true);
          setPendingMove({
            id: item.id,
            toColumn: { id: column.id, identifier: column.identifier },
          });
          return;
        }

        // If not involving IMBALLAGGIO, proceed normally
        setIsMovingTask(true);
        await moveCard(item.id, column.id, column.identifier);
        setIsMovingTask(false);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: !isPreviewMode && monitor.canDrop(),
      }),
    }),
    [column, isMovingTask, isPreviewMode]
  );

  const handleMoveConfirm = async () => {
    if (pendingMove) {
      setIsMovingTask(true);
      await moveCard(
        pendingMove.id,
        pendingMove.toColumn.id,
        pendingMove.toColumn.identifier
      );
      setIsMovingTask(false);
      setShowMoveConfirmation(false);
      setPendingMove(null);
    }
  };

  const handleMoveCancel = () => {
    setShowMoveConfirmation(false);
    setPendingMove(null);
  };

  useEffect(() => {
    // Simulate a small delay to show loading state
    const timer = setTimeout(() => {
      setIsLoadingCards(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [cards]);

  return (
    <>
      <div key={column.id} className=" w-72 h-auto   border p-4">
        <div className="flex flex-row justify-between">
          <h2 className="mb-4 text-xl font-semibold ">
            {column.title}{" "}
            <FontAwesomeIcon
              icon={iconMap[column.icon as keyof typeof iconMap] || faCheck}
            />
          </h2>
          <div className="text-xs">
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
                {(totalValue / 1000).toFixed(2)} K
              </span>
            </p>
            <p>
              V.Totale :{" "}
              <span className="font-bold">
                {" "}
                {(totalColumn / 1000).toFixed(2)} K
              </span>
            </p>
          </div>
          {column.position === 1 && (
            <>
              <Dialog
                open={modalCreate}
                onOpenChange={() => setModalCreate(!modalCreate)}
              >
                <DialogTrigger asChild>
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="border  p-2 "
                    onClick={(prev) => setModalCreate(!prev)}
                  />
                </DialogTrigger>
                <DialogContent className="sm:max-w-[50%] max-h-[90%] overflow-scroll">
                  <DialogHeader>
                    <DialogTitle>Crea progetto</DialogTitle>
                    <DialogDescription>
                      Crea un progetto nuovo
                    </DialogDescription>
                  </DialogHeader>
                  <CreateProductForm
                    data={data}
                    handleClose={() => setModalCreate(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
        <div
          className={`h-full min-h-160 p-1   ${
            isOver && canDrop ? "bg-green-500 border border-zinc-400" : ""
          }`}
          //@ts-ignore
          ref={drop}
        >
          {isLoadingCards
            ? // Loading skeletons for cards
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="mb-4">
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              ))
            : cards
                .sort((a: any, b: any) => {
                  if (column.identifier.includes("SPED")) {
                    return a.unique_code.localeCompare(b.unique_code);
                  } else {
                    if (a.deliveryDate === null && b.deliveryDate === null) {
                      return 0; // equal
                    }
                    if (a.deliveryDate === null) {
                      return 1; // a goes to the end
                    }
                    if (b.deliveryDate === null) {
                      return -1; // b goes to the end
                    }
                    return (
                      new Date(a.deliveryDate).getTime() -
                      new Date(b.deliveryDate).getTime()
                    );
                  }
                })
                .map((card: any) => (
                  <Card
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    data={card}
                    columnIndex={column.position}
                    history={history}
                    isSmall={areAllTabsClosed}
                  />
                ))}
          {/* {canDrop ? "Rilascia qui" : ""} */}
        </div>
        <AlertDialog
          open={showMoveConfirmation}
          onOpenChange={setShowMoveConfirmation}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma Spostamento</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler{" "}
                {column.identifier.includes("IMBALL")
                  ? "spostare questo elemento in imballaggio?"
                  : "spostare questo elemento dall'imballaggio?"}
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
      </div>
    </>
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
}

function KanbanBoard({
  name,
  clients,
  products,
  history,
  initialTasks = [],
  kanban,
  snapshots,
}: KanbanBoardTypes) {
  const [tasks, setTasks] = useState(() => {
    // Ensure initialTasks is always an array
    return Array.isArray(initialTasks) ? initialTasks : [];
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
  const [lastModifiedTimestamp, setLastModifiedTimestamp] =
    useState<string>("");
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const tasksRef = useRef(tasks); // Keep a ref of current tasks to avoid unnecessary updates

  // Update ref when tasks change
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Function to check for updates using last-modified timestamp
  const checkForUpdates = async () => {
    try {
      const response = await fetch("/api/kanban/tasks/check-updates", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "If-Modified-Since": lastModifiedTimestamp,
        },
      });

      if (response.status === 304) {
        // No changes
        return false;
      }

      if (!response.ok) throw new Error("Failed to check for updates");

      const newTimestamp = response.headers.get("Last-Modified");
      if (newTimestamp && newTimestamp !== lastModifiedTimestamp) {
        setLastModifiedTimestamp(newTimestamp);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking for updates:", error);
      return false;
    }
  };

  // Function to fetch and update tasks
  const fetchAndUpdateTasks = async (forceFetch = false) => {
    try {
      const response = await fetch("/api/kanban/tasks", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch tasks");

      const newTimestamp = response.headers.get("Last-Modified");
      if (newTimestamp) {
        setLastModifiedTimestamp(newTimestamp);
      }

      const newTasks = await response.json();

      // Only update if the data has actually changed
      if (
        Array.isArray(newTasks) &&
        JSON.stringify(newTasks) !== JSON.stringify(tasksRef.current)
      ) {
        safeSetTasks(newTasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile aggiornare i dati",
      });
    }
  };

  // Real-time update system
  useEffect(() => {
    let isActive = true;
    let isChecking = false;

    const startPolling = async () => {
      if (!isActive || isChecking) return;

      try {
        isChecking = true;
        // Check for updates
        const hasUpdates = await checkForUpdates();

        if (hasUpdates) {
          // If there are updates, fetch the new data
          await fetchAndUpdateTasks(true);
        }
      } catch (error) {
        console.error("Error in polling:", error);
      } finally {
        isChecking = false;
      }

      // Schedule next check
      if (isActive) {
        pollingIntervalRef.current = setTimeout(startPolling, 1000);
      }
    };

    // Initial fetch
    fetchAndUpdateTasks(true).then(() => {
      // Start polling after initial fetch
      if (isActive) {
        startPolling();
      }
    });

    // Cleanup
    return () => {
      isActive = false;
      if (pollingIntervalRef.current) {
        clearTimeout(pollingIntervalRef.current);
      }
    };
  }, []); // Empty dependency array since we want this to run once on mount

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
        console.error("Tasks is not an array:", tasks);
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
      tasksRef.current = updatedTasks;

      const response = await fetch("api/kanban/tasks/move", {
        method: "POST",
        body: JSON.stringify({
          id: id,
          column: column,
          columnName: columnName,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Move card error:", errorData);
        throw new Error(
          `Failed to move card: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const responseData = await response.json();
      const newTimestamp = response.headers.get("Last-Modified");
      if (newTimestamp) {
        setLastModifiedTimestamp(newTimestamp);
      }

      // Update the card with server response data
      const finalTasks = updatedTasks.map((card) => {
        if (card.id === id) {
          return {
            ...card,
            percentStatus: responseData.data.percentStatus,
          };
        }
        return card;
      });

      safeSetTasks(finalTasks);
      tasksRef.current = finalTasks;

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
        tasksRef.current = revertedTasks;
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
      // Reset to original state and fetch latest data
      await fetchAndUpdateTasks();
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
      console.error("Error fetching snapshot:", error);
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

  useEffect(() => {
    // Check if tasks exists and has items before checking for preview
    const isViewingSnapshot =
      Array.isArray(tasks) &&
      tasks.length > 0 &&
      tasks.some((task) => task.isPreview);

    if (isViewingSnapshot) {
      return;
    }

    const pollForUpdates = async () => {
      try {
        const response = await fetch("/api/kanban/tasks", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        const data = await response.json();

        // Only update if we have new data and it's different
        if (
          data &&
          Array.isArray(data) &&
          JSON.stringify(data) !== JSON.stringify(tasks)
        ) {
          safeSetTasks(data);
        } else if (!Array.isArray(data)) {
          safeSetTasks([]); // Set empty array if data is not an array
        }
      } catch (error) {
        console.error("Error polling for updates:", error);
        safeSetTasks([]); // Set empty array on error
      }
    };

    const intervalId = setInterval(pollForUpdates, 5000);
    return () => clearInterval(intervalId);
  }, [tasks]);

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
      await saveKanban(kanbanData);
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
      console.warn("Attempted to set non-array tasks:", newTasks);
      setTasks([]);
    }
  };

  return (
    <>
      {kanban && (
        <div className="w-full pt-4 pb-2 px-8">
          <h1
            className="text-2xl font-bold mb-4 p-4 rounded-lg text-white"
            style={{ backgroundColor: kanban.color || "#1e293b" }}
          >
            KANBAN {kanban.title}
          </h1>
          <div className="flex justify-between items-center gap-4 max-w-[1000px]">
            <h4
              className={`text-foreground text-sm font-semibold cursor-pointer hover:underline transition-all duration-300 ${
                isTimelineOpen ? "opacity-50" : "opacity-100"
              }`}
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            >
              Time machine
            </h4>

            <div
              className={`top-36 left-76 fixed flex justify-start gap-2 ${
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

            <KanbanManagementModal
              kanban={kanban}
              onSave={handleSaveKanban}
              mode="edit"
              hasTasks={tasks.length > 0}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-background hover:bg-accent"
                >
                  {tasks.length > 0 ? "Modifica Icone" : "Modifica Kanban"}
                </Button>
              }
            />
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
        <>
          <div
            className={`${
              loading ? "opacity-50" : ""
            } transition-all duration-500 pt-4 px-8 min-h-screen`}
          >
            <div className="grid grid-flow-col gap-4 pt-4">
              {kanban.columns.map((column: KanbanColumn) => {
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
                  />
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="w-full h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="font-bold text-2xl mb-2">
              Nessuna Board {name} impostata!
            </h1>
            <p className="mb-4">
              Seleziona un kanban esistente dal menu laterale o creane uno nuovo
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default KanbanBoard;
