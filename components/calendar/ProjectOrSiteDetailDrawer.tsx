"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  BellRing,
  Clock3,
  Pencil,
  FolderKanban,
  UserRound,
} from "lucide-react";
import { formatMinutesAsHours, formatTimeLabel } from "./calendar-utils";
import DialogEdit from "@/app/sites/[domain]/timetracking/dialogEdit";
import type { Roles, Task, User } from "@/types/supabase";
import type {
  WeeklyCalendarItem,
  WeeklyCalendarTimetrackingEntry,
} from "./weekly-calendar-types";

interface ProjectOrSiteDetailDrawerProps {
  item: WeeklyCalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editableTimetrackingEntry?: WeeklyCalendarTimetrackingEntry | null;
  editUsers?: User[];
  editRoles?: Roles[];
  editTasks?: Task[];
}

export function ProjectOrSiteDetailDrawer({
  item,
  open,
  onOpenChange,
  editableTimetrackingEntry = null,
  editUsers = [],
  editRoles = [],
  editTasks = [],
}: ProjectOrSiteDetailDrawerProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const noopSetData = () => null;
  const start = item ? new Date(item.startDatetime) : null;
  const end = item ? new Date(item.endDatetime) : null;
  const scheduleDisplay = item?.scheduleDisplay || "timed";
  const durationHours =
    item && start && end
      ? item.actualHours ??
        item.estimatedHours ??
        (scheduleDisplay === "timed"
          ? Math.max(0.5, (end.getTime() - start.getTime()) / 3_600_000)
          : 0)
      : 0;

  useEffect(() => {
    if (!open) {
      setIsEditOpen(false);
    }
  }, [open, item?.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {item ? (
          <>
            <SheetHeader className="space-y-3 border-b pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="text-white"
                  style={{ backgroundColor: item.color || "#64748b" }}
                >
                  {item.linkType === "site" ? "Cantiere" : "Progetto"}
                </Badge>
                {item.status && <Badge variant="outline">{item.status}</Badge>}
                {scheduleDisplay === "time-pending" && (
                  <Badge
                    variant="outline"
                    className="border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-200"
                  >
                    <BellRing className="mr-1 h-3 w-3" />
                    Ora da definire
                  </Badge>
                )}
                {item.sourceMode && (
                  <Badge variant="secondary">
                    {item.sourceMode === "planned" ? "Pianificato" : "Consuntivo"}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <SheetTitle className="text-left text-xl">
                  {item.projectNumber ? `${item.projectNumber} - ` : ""}
                  {item.projectName}
                </SheetTitle>
                <SheetDescription className="text-left">
                  Dettaglio rapido operativo con accesso diretto alla scheda completa.
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="space-y-6 p-4">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Orario
                  </p>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    <span>{getScheduleLabel(scheduleDisplay, start, end)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Durata
                  </p>
                  <p className="text-sm font-medium">
                    {durationHours > 0
                      ? formatMinutesAsHours(Math.round(durationHours * 60))
                      : "Non definita"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Collaboratore
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <span>{item.assignedUser?.name || "Non assegnato"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tipologia
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span>{item.category || item.activityType || "Operativo"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Metriche ore</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Ore pianificate
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatMinutesAsHours(
                        Math.round((item.estimatedHours || 0) * 60)
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Ore effettive
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatMinutesAsHours(
                        Math.round((item.actualHours || 0) * 60)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {item.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Note</h3>
                  <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
                    {item.notes}
                  </div>
                </div>
              )}

              {item.metadata && Object.keys(item.metadata).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Contesto</h3>
                    <div className="space-y-2 text-sm">
                      {Object.entries(item.metadata).map(([key, value]) => {
                        if (value === null || value === undefined || value === "") {
                          return null;
                        }

                        return (
                          <div
                            key={key}
                            className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                          >
                            <span className="capitalize text-muted-foreground">
                              {key}
                            </span>
                            <span className="text-right font-medium">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-auto border-t p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                {editableTimetrackingEntry && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifica ore
                  </Button>
                )}
                {item.timeTrackingHref && (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={item.timeTrackingHref}>
                      <Clock3 className="mr-2 h-4 w-4" />
                      Registra ore
                    </Link>
                  </Button>
                )}
                {item.detailHref && (
                  <Button asChild className="flex-1">
                    <Link href={item.detailHref}>
                      Apri scheda completa
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {item.secondaryHref && (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={item.secondaryHref}>Apri modifica rapida</Link>
                  </Button>
                )}
              </div>
            </div>
            {editableTimetrackingEntry && (
              <DialogEdit
                isOpen={isEditOpen}
                data={editableTimetrackingEntry}
                setData={noopSetData}
                setOpen={setIsEditOpen}
                users={editUsers}
                roles={editRoles}
                tasks={editTasks}
              />
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function getScheduleLabel(
  scheduleDisplay: "timed" | "time-pending" | "date-only",
  start: Date | null,
  end: Date | null
): string {
  if (scheduleDisplay === "time-pending") {
    return "Orario da definire";
  }

  if (scheduleDisplay === "date-only") {
    return "Entro il giorno pianificato";
  }

  return `${start ? formatTimeLabel(start) : "--:--"} - ${
    end ? formatTimeLabel(end) : "--:--"
  }`;
}
