"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import {
  Action,
  Client,
  PackingControl,
  QualityControl,
  Task,
} from "@prisma/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { DateManager } from "../../package/utils/dates/date-manager";
import { calculateCurrentValue } from "../../package/utils/various/calculateCurrentValue";
import { BellIcon } from "lucide-react";
import { useToast } from "../ui/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
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

import { archiveItem } from "../../app/(user)/kanban/actions/archived-item-action";
import { Button } from "../ui/button";

type Supplier = {
  id: number;
  name: string;
  isDefault: boolean;
};

type TaskSupplier = {
  id: number;
  supplierId: number;
  supplier: Supplier;
  deliveryDate: string | null;
};

function checkCompletionStatus(items: any) {
  let allDone = items.length > 0;
  let someDone = false;
  items.forEach((item: any) => {
    if (item.passed === "DONE") {
      someDone = true;
    } else {
      allDone = false; // If any item isn't DONE, then not all are done
    }
  });
  if (allDone) return "allDone";
  if (someDone) return "someDone";
  return "noneDone";
}

export default function Card({
  id,
  title,
  data,
  columnIndex,
  history,
  isSmall: isSmallInitial,
}: {
  id: number;
  title: string;
  data: Task | Client | any;
  columnIndex: number;
  history: Action;
  isSmall: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [isLocked, setIsLocked] = useState(data.locked);
  const [timeState, setTimeState] = useState("normal");
  const [clickTimeout, setClickTimeout] = useState<any | null>(null);
  const [ferramentaCheck, setFerramentaCheck] = useState(data.ferramenta);
  const [metalliCheck, setMetalliCheck] = useState(data.metalli);
  const [currentValue, setCurrentValue] = useState(0);
  const { toast } = useToast();
  const [isSmall, setIsSmall] = useState(() => {
    // Load the initial value from localStorage
    try {
      const saved = localStorage.getItem(`isSmall-${id}`);
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.warn("Error parsing localStorage value for isSmall:", error);
      return false;
    }
  });
  const [stoccatoCheck, setStoccatoCheck] = useState(data.stoccato);
  const [stoccatoDate, setStoccatoDate] = useState(data.stoccaggiodate);
  const [taskSuppliers, setTaskSuppliers] = useState<TaskSupplier[]>([]);
  const [legnoCheck, setLegnoCheck] = useState(data.legno);
  const [verniceCheck, setVerniceCheck] = useState(data.vernice);
  const [altroCheck, setAltroCheck] = useState(data.altro);

  useEffect(() => {
    // Save the isSmall value to localStorage whenever it changes
    localStorage.setItem(`isSmall-${id}`, JSON.stringify(isSmall));
  }, [isSmall, id]);

  useEffect(() => {
    if (isSmallInitial === true) {
      setIsSmall(true);
    } else if (
      isSmallInitial === false &&
      data.column?.identifier !== "SPEDITO"
    ) {
      setIsSmall(false);
    } else if (data.column?.identifier === "SPEDITO") {
      setIsSmall(true);
    }
  }, [isSmallInitial]);

  useEffect(() => {
    // get the time in the variable (assuming it's in the format of "hh:mm:ss")
    if (data.deliveryDate) {
      // get the current time
      const currentTime = new Date();
      const targetTime = new Date(data.deliveryDate); // Change this to your variable name.
      // compare the times
      if (
        currentTime.getTime() > targetTime.getTime() &&
        data.column?.identifier !== "SPEDITO"
      ) {
        setTimeState("late");
      } else {
        setTimeState("normal");
      }
    }
  }, []);

  useEffect(() => {
    setCurrentValue(calculateCurrentValue(data, columnIndex));
  }, [data, columnIndex]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        // Carica i fornitori associati al task
        const taskSuppResponse = await fetch(`/api/tasks/${id}/suppliers`);
        if (!taskSuppResponse.ok) {
          throw new Error("Failed to fetch suppliers");
        }
        const taskSuppData = await taskSuppResponse.json();

        setTaskSuppliers(Array.isArray(taskSuppData) ? taskSuppData : []);
      } catch (error) {
        console.error("Error loading suppliers:", error);
        setTaskSuppliers([]);
      }
    };

    loadSuppliers();
  }, [id]);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "card",
      item: {
        id,
        columnIndex,
        fromColumn: data.column?.identifier,
      },
      canDrag: !isLocked && !data.isPreview,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id, data.column?.identifier, data.isPreview, isLocked]
  );

  const onClick = useCallback(
    (e: any) => {
      if (e.target.closest("button") || e.target.closest(".button-container")) {
        return;
      }

      if (clickTimeout) {
        clearTimeout(clickTimeout);
        setClickTimeout(null);
        setIsSmall(!isSmall);
      } else {
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

  async function handleFerramentaCheck(checked: boolean) {
    const response = await fetch("api/kanban/tasks/ferramenta", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        ferramentaStatus: checked,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) {
      toast({
        description: checked
          ? `Ferramenta aggiunta correttamente.`
          : `Ferramenta rimossa correttamente.`,
      });
      setFerramentaCheck(checked);
    } else {
      setFerramentaCheck(!checked);
    }
  }

  async function handleMetalliCheck(checked: boolean) {
    const response = await fetch("api/kanban/tasks/metalli", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        metalliStatus: checked,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) {
      toast({
        description: checked
          ? `Metalli aggiunti correttamente.`
          : `Metalli rimossi correttamente.`,
      });
      setMetalliCheck(checked);
    } else {
      setMetalliCheck(!checked);
    }
  }

  async function handleStoccatoCheck(checked: boolean) {
    const currentDate = new Date().toISOString();

    const response = await fetch("api/kanban/tasks/stoccato", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        stoccatoStatus: checked,
        stoccatoDate: checked ? currentDate : null,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) {
      toast({
        description: checked
          ? `Stoccato aggiunto correttamente.`
          : `Stoccato rimosso correttamente.`,
      });
      setStoccatoCheck(checked);
      setStoccatoDate(checked ? currentDate : null);
    } else {
      setStoccatoCheck(!checked);
    }
  }

  async function handleLegnoCheck(checked: boolean) {
    const response = await fetch("api/kanban/tasks/legno", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        legnoStatus: checked,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      toast({
        description: checked
          ? `Legno aggiunto correttamente.`
          : `Legno rimosso correttamente.`,
      });
      setLegnoCheck(checked);
    } else {
      setLegnoCheck(!checked);
    }
  }

  async function handleVerniceCheck(checked: boolean) {
    const response = await fetch("api/kanban/tasks/vernice", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        verniceStatus: checked,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      toast({
        description: checked
          ? `Vernice aggiunta correttamente.`
          : `Vernice rimossa correttamente.`,
      });
      setVerniceCheck(checked);
    } else {
      setVerniceCheck(!checked);
    }
  }

  async function handleAltroCheck(checked: boolean) {
    const response = await fetch("api/kanban/tasks/altro", {
      method: "POST",
      body: JSON.stringify({
        id: id,
        altroStatus: checked,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      toast({
        description: checked
          ? `Altro aggiunto correttamente.`
          : `Altro rimosso correttamente.`,
      });
      setAltroCheck(checked);
    } else {
      setAltroCheck(!checked);
    }
  }

  const packingStatus = checkCompletionStatus(data.PackingControl);
  const qualityStatus = checkCompletionStatus(data.QualityControl);
  // Determine the final bell color based on both statuses
  let bellColor = "black"; // default color
  if (packingStatus === "someDone" || qualityStatus === "someDone") {
    bellColor = "orange";
  } else if (packingStatus === "allDone" && qualityStatus === "allDone") {
    bellColor = "green";
  } else if (packingStatus === "allDone" && qualityStatus === "noneDone") {
    bellColor = "orange";
  } else if (packingStatus === "noneDone" && qualityStatus === "allDone") {
    bellColor = "orange";
  }

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

  return (
    <ContextMenu>
      <div
        className={`w-full mb-2  p-1 shadow-md select-none overscroll-contain  ${
          data.isPreview ? "opacity-75 cursor-not-allowed" : ""
        } ${
          isLocked
            ? timeState === "normal"
              ? "bg-slate-500 dark:bg-slate-800"
              : "bg-red-500 dark:bg-red-500"
            : timeState === "normal"
            ? "bg-slate-500 dark:bg-slate-800"
            : "bg-red-800 dark:bg-red-800 animate-pulse"
        } ${isSmall ? " h-24" : ""}`}
        //@ts-ignore
        ref={data.isPreview ? null : drag}
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: data.isPreview ? "not-allowed" : "move",
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={onClick}
      >
        <ContextMenuTrigger>
          <div
            className={`p-1 ${
              timeState === "late"
                ? "text-white"
                : timeState === "normal" && "text-white dark:text-black"
            }`}
          >
            {!isSmall ? (
              <div className="pointer-events-none">
                <div className=" border-b flex flex-row justify-between align-top items-start">
                  <div className="flex flex-col">
                    <p className="font-bold">{data.unique_code}</p>
                    <span className="text-xs font-light">
                      {data.sellProduct?.name}
                    </span>
                    <span className="text-xs font-medium">{data.name}</span>
                  </div>
                  <div>
                    <p className="text-sm">
                      {/* <FontAwesomeIcon icon={faClock} className="pr-1" /> */}
                      {data.deliveryDate !== null && (
                        <span className="font-bold">
                          {DateManager.formatEUDate(data.deliveryDate)}
                        </span>
                      )}
                      {data.deliveryDate !== null && (
                        <span className="pl-1">
                          | {DateManager.getWeekNumber(data.deliveryDate)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="font-bold text-lg flex flex-row border-b mb-2">
                  <p>{data.client?.businessName || data.client?.name}</p>
                </div>

                <div className="flex flex-row gap-2">
                  <div className="flex flex-col w-full">
                    {data.positions.length > 0 && (
                      <div className="grid grid-rows-2 grid-cols-4  pb-2">
                        {data.positions.map(
                          (position: string, index: number) => (
                            <p
                              className="border-[0.75px]  text-center pl-1 text-xs"
                              key={index}
                            >
                              {position}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col w-full h-1/2">
                    <div className="border w-full flex justify-center items-center">
                      <p>{(currentValue / 1000).toFixed(2)} K</p>
                      <p>{data.columnPosition}</p>
                    </div>
                    <div className="border-l border-r border-b flex justify-center items-center">
                      <p> {(data.sellPrice / 1000).toFixed(2)} K</p>
                    </div>
                    {/* Valori */}
                  </div>
                </div>
                <div className="flex flex-row justify-between gap-4">
                  <div className="button-container flex flex-col gap-1 pointer-events-auto">
                    {data.kanban?.identifier === "ARREDAMENTO" ? (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLegnoCheck(!legnoCheck);
                          }}
                          className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                            legnoCheck
                              ? " bg-green-500 text-white border-white"
                              : ""
                          }`}
                        >
                          Legno
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleFerramentaCheck(!ferramentaCheck);
                          }}
                          className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                            ferramentaCheck
                              ? " bg-green-500 text-white border-white"
                              : ""
                          }`}
                        >
                          Ferr.
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVerniceCheck(!verniceCheck);
                          }}
                          className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                            verniceCheck
                              ? " bg-green-500 text-white border-white"
                              : ""
                          }`}
                        >
                          Vernice
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAltroCheck(!altroCheck);
                          }}
                          className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                            altroCheck
                              ? " bg-green-500 text-white border-white"
                              : ""
                          }`}
                        >
                          Altro
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleFerramentaCheck(!ferramentaCheck);
                          }}
                          className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                            ferramentaCheck
                              ? " bg-green-500 text-white border-white"
                              : ""
                          }`}
                        >
                          Ferr.
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMetalliCheck(!metalliCheck);
                          }}
                          className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                            metalliCheck
                              ? " bg-green-500 text-white border-white"
                              : ""
                          }`}
                        >
                          Metal.
                        </Button>
                        {data.column?.identifier === "IMBALLAGGIO" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStoccatoCheck(!stoccatoCheck);
                            }}
                            className={`text-xs px-3 py-2 border border-gray-400 bg-white text-black font-semibold rounded shadow-xs transition-colors duration-150${
                              stoccatoCheck
                                ? " bg-orange-500 text-white border-white"
                                : ""
                            }`}
                          >
                            Stocc.
                            {stoccatoDate && (
                              <span className="text-xs ml-1">
                                {DateManager.formatEUDate(stoccatoDate)}
                              </span>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-xs">{data.other && data.other}</p>
                  </div>

                  {data.PackingControl.length >= 1 ||
                  data.QualityControl.length >= 1 ? (
                    <div className="pointer-events-auto">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <BellIcon className={`text-${bellColor}-500`} />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div>
                              {data.PackingControl.length >= 1 &&
                                data.PackingControl.map(
                                  (item: PackingControl) => (
                                    <p key={item.id}>Imb.{item.passed}</p>
                                  )
                                )}
                              {data.QualityControl.length >= 1 &&
                                data.QualityControl.map(
                                  (item: QualityControl) => (
                                    <p key={item.id}>
                                      QC P. {item.position_nr} - {item.passed}
                                    </p>
                                  )
                                )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ) : (
                    ""
                  )}
                </div>

                <div className="mt-2 border-t pt-2">
                  <p className="text-sm font-semibold mb-2">Fornitori</p>
                  <div className="flex flex-wrap gap-2">
                    {taskSuppliers &&
                      taskSuppliers.map((ts) => {
                        const isDeliveryToday =
                          ts.deliveryDate &&
                          new Date(ts.deliveryDate).toDateString() ===
                            new Date().toDateString();
                        const isDeliveryLate =
                          ts.deliveryDate &&
                          new Date(ts.deliveryDate) < new Date();
                        console.log("ts", ts);
                        return (
                          <div
                            key={ts.id}
                            className={`text-xs px-2 py-1 rounded ${
                              isDeliveryToday
                                ? "bg-green-100 text-green-800 dark:bg-green-400 dark:text-green-100"
                                : isDeliveryLate
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                : "bg-gray-100 text-black dark:bg-gray-400 dark:text-black"
                            }`}
                          >
                            <span className="font-medium">
                              {/* @ts-ignore */}
                              {ts.supplier.short_name}
                            </span>
                            {ts.deliveryDate && (
                              <span className="ml-2">
                                {new Date(ts.deliveryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex flex-row gap-2 justify-between align-middle items-end pt-4">
                  <p className="text-xs">{data.percentStatus}%</p>
                  <div className="w-full  rounded-full">
                    <div
                      style={{ width: `${data.percentStatus}%` }}
                      className="h-2 bg-green-500 rounded-full"
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col justify-between h-full gap-2">
                  <div className="flex flex-col">
                    <div className="flex flex-row justify-between align-middle items-start">
                      <div className="font-bold">{data.unique_code}</div>
                      <div>
                        <p className="text-sm">
                          <FontAwesomeIcon icon={faClock} className="pr-1" />
                          {data.deliveryDate !== null &&
                            DateManager.formatEUDate(data.deliveryDate)}
                          {data.deliveryDate !== null && (
                            <span className="pl-1 font-bold">
                              | {DateManager.getWeekNumber(data.deliveryDate)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row text-sm">
                      <p>{data.client?.businessName} </p>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 justify-end align-middle items-center">
                    {" "}
                    <p className="text-xs">{data.percentStatus}%</p>
                    <div className="w-full bg-gray-200 rounded-full">
                      <div
                        style={{ width: `${data.percentStatus}%` }}
                        className="h-2 bg-green-500 rounded-full"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Dialog open={showModal} onOpenChange={(open) => setShowModal(open)}>
            <DialogContent className="max-w-228 max-h-[90%] overflow-scroll">
              <DialogHeader>
                <DialogTitle>Modifica {data.unique_code}</DialogTitle>
                {/* <DialogDescription>Crea un prodotto nuovo</DialogDescription> */}
              </DialogHeader>
              <EditTaskKanban
                handleClose={() => setShowModal(false)}
                setIsLocked={setIsLocked}
                open={showModal}
                setOpenModal={setShowModal}
                setOpen={setShowModal}
                resource={data}
                history={history}
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
