"use client";

import React, { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CalendarProjectCard } from "../CalendarProjectCard";
import type {
  CalendarAssignedUser,
  WeeklyCalendarItem,
} from "../weekly-calendar-types";
import { ConflictBadge } from "./ConflictBadge";
import { layoutDayEvents } from "./useOverlapLayout";
import {
  GRID_HEIGHT,
  TIME_COL_WIDTH,
  WEEK_SLOT_CONFIG,
  buildHourLabels,
} from "./calendar-grid-config";

const UNASSIGNED_KEY = "__unassigned__";

interface ResourceViewProps {
  items: WeeklyCalendarItem[];
  onItemClick?: (item: WeeklyCalendarItem) => void;
  initialDay?: Date;
}

interface ResourceLane {
  key: string;
  user: CalendarAssignedUser | null;
  items: WeeklyCalendarItem[];
}

function getItemCollaborators(item: WeeklyCalendarItem): CalendarAssignedUser[] {
  if (item.collaborators && item.collaborators.length > 0) {
    return item.collaborators;
  }
  if (item.assignedUser) {
    return [item.assignedUser];
  }
  return [];
}

/**
 * Vista "Per risorsa": una lane (colonna) per collaboratore con asse Y = ore.
 * Ogni evento compare nella lane di ciascun collaboratore assegnato, riducendo
 * i conflitti visivi tipici della vista a giorni. Sola lettura.
 */
export function ResourceView({ items, onItemClick, initialDay }: ResourceViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(
    () => initialDay ?? new Date()
  );

  const config = WEEK_SLOT_CONFIG;
  const hourLabels = useMemo(() => buildHourLabels(), []);

  const lanes = useMemo<ResourceLane[]>(() => {
    const map = new Map<string, ResourceLane>();
    const ordered: string[] = [];

    const pushItem = (key: string, user: CalendarAssignedUser | null, item: WeeklyCalendarItem) => {
      if (!map.has(key)) {
        map.set(key, { key, user, items: [] });
        ordered.push(key);
      }
      map.get(key)!.items.push(item);
    };

    items.forEach((item) => {
      if ((item.scheduleDisplay ?? "timed") !== "timed") return;
      const collaborators = getItemCollaborators(item);
      if (collaborators.length === 0) {
        pushItem(UNASSIGNED_KEY, null, item);
        return;
      }
      collaborators.forEach((user) => pushItem(String(user.id), user, item));
    });

    return ordered
      .map((key) => map.get(key)!)
      .sort((a, b) => {
        if (a.key === UNASSIGNED_KEY) return 1;
        if (b.key === UNASSIGNED_KEY) return -1;
        return (a.user?.name || "").localeCompare(b.user?.name || "", "it");
      });
  }, [items]);

  const laneLayouts = useMemo(
    () =>
      lanes.map((lane) => ({
        lane,
        layout: layoutDayEvents(lane.items, selectedDay, config),
      })),
    [lanes, selectedDay, config]
  );

  const gridTemplateColumns = `${TIME_COL_WIDTH}px repeat(${Math.max(
    laneLayouts.length,
    1
  )}, minmax(150px, 1fr))`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDay((current) => addDays(current, -1))}
            aria-label="Giorno precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDay((current) => addDays(current, 1))}
            aria-label="Giorno successivo"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setSelectedDay(new Date())}
          >
            Oggi
          </Button>
          <span className="ml-2 text-sm font-semibold capitalize">
            {format(selectedDay, "EEEE d MMMM yyyy", { locale: it })}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {lanes.length} risors{lanes.length === 1 ? "a" : "e"}
        </div>
      </div>

      {laneLayouts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
          Nessuna attività con orario per questo giorno.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-card">
          <div
            className="grid"
            style={{
              gridTemplateColumns,
              minWidth: TIME_COL_WIDTH + laneLayouts.length * 150,
            }}
          >
            {/* Header risorse */}
            <div className="sticky top-0 z-20 border-b border-border/60 bg-card" />
            {laneLayouts.map(({ lane, layout }) => (
              <div
                key={`head-${lane.key}`}
                className="sticky top-0 z-20 flex items-center justify-center gap-1.5 border-b border-l border-border/60 bg-card px-1 py-2 text-center"
              >
                {lane.user ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={lane.user.avatarUrl || undefined} />
                    <AvatarFallback
                      className="text-[9px] font-semibold text-white"
                      style={{ backgroundColor: lane.user.color || "#6366f1" }}
                    >
                      {lane.user.initials || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="max-w-[120px] truncate text-xs font-semibold">
                  {lane.user?.name || "Non assegnati"}
                </span>
                {layout.conflictCount > 0 && (
                  <ConflictBadge count={layout.conflictCount} />
                )}
              </div>
            ))}

            {/* Gutter orari */}
            <div
              className="relative border-r border-border/60 bg-muted/10"
              style={{ height: GRID_HEIGHT }}
            >
              {hourLabels.map((label) => (
                <div
                  key={label.hour}
                  className="absolute inset-x-0 px-1 text-[10px] text-muted-foreground"
                  style={{ top: label.top }}
                >
                  {String(label.hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Colonne risorse */}
            {laneLayouts.map(({ lane, layout }) => (
              <div
                key={`col-${lane.key}`}
                className="relative border-l border-border/60"
                style={{ height: GRID_HEIGHT }}
              >
                {Array.from(
                  { length: Math.round(((WEEK_SLOT_CONFIG.slotEndHour - WEEK_SLOT_CONFIG.slotStartHour) * 60) / WEEK_SLOT_CONFIG.slotMinutes) },
                  (_, index) => {
                    const isHour = ((index * WEEK_SLOT_CONFIG.slotMinutes) % 60) === 0;
                    return (
                      <div
                        key={index}
                        className={cn(
                          "absolute inset-x-0 border-t",
                          isHour
                            ? "border-border/70"
                            : "border-dashed border-border/30"
                        )}
                        style={{
                          top: index * WEEK_SLOT_CONFIG.slotHeight,
                          height: WEEK_SLOT_CONFIG.slotHeight,
                        }}
                      />
                    );
                  }
                )}

                {layout.events.map((event) => (
                  <div
                    key={`${lane.key}-${event.item.id}`}
                    className="absolute px-0.5"
                    style={{
                      top: event.top,
                      left: `${(event.lane / event.totalLanes) * 100}%`,
                      width: `calc(${100 / event.totalLanes}% - 3px)`,
                      height: event.height,
                    }}
                  >
                    <div
                      className={cn(
                        "h-full min-h-0",
                        event.isConflict && "rounded-xl ring-2 ring-destructive/70"
                      )}
                    >
                      <CalendarProjectCard
                        item={event.item}
                        compact
                        onClick={
                          onItemClick ? () => onItemClick(event.item) : undefined
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
