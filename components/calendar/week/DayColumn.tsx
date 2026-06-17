"use client";

import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { makeGridDroppableId } from "@/lib/calendar-drag";
import { EventCard } from "./EventCard";
import type { DayLayout, WeekSlotConfig } from "./useOverlapLayout";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";

export type DenseMode = "side-by-side" | "stacked";

interface DayColumnProps {
  dayKey: string;
  layout: DayLayout;
  config: WeekSlotConfig;
  gridHeight: number;
  isMini?: boolean;
  isToday?: boolean;
  denseMode?: DenseMode;
  draggable?: boolean;
  onItemClick?: (item: WeeklyCalendarItem) => void;
  onMiniClick?: () => void;
}

const STACK_OFFSET_PX = 8;

export function DayColumn({
  dayKey,
  layout,
  config,
  gridHeight,
  isMini = false,
  isToday = false,
  denseMode = "side-by-side",
  draggable = true,
  onItemClick,
  onMiniClick,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeGridDroppableId(dayKey),
  });

  const slotCount = useMemo(() => {
    const totalMinutes = (config.slotEndHour - config.slotStartHour) * 60;
    return Math.round(totalMinutes / config.slotMinutes);
  }, [config.slotEndHour, config.slotMinutes, config.slotStartHour]);

  if (isMini) {
    return (
      <button
        type="button"
        ref={setNodeRef}
        onClick={onMiniClick}
        title="Espandi giornata"
        className={cn(
          "relative block h-full w-full overflow-hidden border-l border-border/60 bg-card/40 transition-colors hover:bg-accent/40",
          isToday && "bg-primary/5",
          isOver && "bg-primary/10"
        )}
        style={{ height: gridHeight }}
      >
        {layout.events.map((event) => (
          <div
            key={event.item.id}
            className="absolute inset-x-0.5 rounded-sm"
            style={{
              top: event.top,
              height: Math.max(4, event.height),
              backgroundColor: event.item.color || "#64748b",
              opacity: 0.85,
            }}
          />
        ))}
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative border-l border-border/60 transition-colors",
        isToday && "bg-primary/5",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary/40"
      )}
      style={{ height: gridHeight }}
    >
      {/* Linee orarie */}
      {Array.from({ length: slotCount }, (_, index) => {
        const isHour =
          ((index * config.slotMinutes) % 60) === 0;
        return (
          <div
            key={index}
            className={cn(
              "absolute inset-x-0 border-t",
              isHour ? "border-border/70" : "border-border/30 border-dashed"
            )}
            style={{ top: index * config.slotHeight, height: config.slotHeight }}
          />
        );
      })}

      {/* Eventi posizionati */}
      {layout.events.map((event) => {
        const positioning =
          denseMode === "stacked"
            ? {
                top: event.top + event.lane * STACK_OFFSET_PX,
                left: event.lane * STACK_OFFSET_PX,
                width: `calc(100% - ${event.lane * STACK_OFFSET_PX + 4}px)`,
                zIndex: 10 + event.lane,
              }
            : {
                top: event.top,
                left: `${(event.lane / event.totalLanes) * 100}%`,
                width: `calc(${100 / event.totalLanes}% - 3px)`,
                zIndex: 1,
              };

        return (
          <div
            key={event.item.id}
            className="absolute px-0.5"
            style={{
              top: positioning.top,
              left: positioning.left,
              width: positioning.width,
              height: event.height,
              zIndex: positioning.zIndex,
            }}
          >
            <EventCard
              item={event.item}
              variant={event.totalLanes > 1 ? "split" : "full"}
              draggable={draggable}
              isConflict={event.isConflict}
              onClick={onItemClick ? () => onItemClick(event.item) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
