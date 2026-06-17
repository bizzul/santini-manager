"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { makeUnscheduledDroppableId } from "@/lib/calendar-drag";
import { EventCard } from "./EventCard";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";

interface UnscheduledTimeContainerProps {
  dayKey: string;
  items: WeeklyCalendarItem[];
  isMini?: boolean;
  draggable?: boolean;
  onItemClick?: (item: WeeklyCalendarItem) => void;
}

/**
 * Blocco "Orario da assegnare" ancorato in cima alla colonna-giorno, fuori
 * dalla griglia oraria. È un drop target: rilasciando una card qui si assegna
 * il giorno senza forzare un orario (resta "time-pending").
 */
export function UnscheduledTimeContainer({
  dayKey,
  items,
  isMini = false,
  draggable = true,
  onItemClick,
}: UnscheduledTimeContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: makeUnscheduledDroppableId(dayKey),
  });

  const hasItems = items.length > 0;

  if (isMini) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[6px] border-b border-border/60 px-0.5 py-0.5",
          isOver && "bg-primary/15"
        )}
      >
        {hasItems && (
          <div
            className="mx-auto h-1.5 w-1.5 rounded-full bg-warning"
            title={`${items.length} da assegnare`}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b border-l border-border/60 p-1 transition-colors",
        isOver
          ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
          : hasItems
            ? "bg-warning/5"
            : "bg-transparent"
      )}
    >
      {hasItems ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1 px-0.5 text-[9px] font-medium uppercase tracking-wide text-warning">
            <Clock className="h-2.5 w-2.5" />
            <span>Orario da assegnare</span>
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.id} className="min-h-[64px]">
                <EventCard
                  item={item}
                  variant="split"
                  draggable={draggable}
                  onClick={onItemClick ? () => onItemClick(item) : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex h-4 items-center justify-center rounded border border-dashed border-transparent text-[9px] text-muted-foreground transition-colors",
            isOver && "border-primary/40 text-primary"
          )}
        >
          {isOver ? "Rilascia qui (senza orario)" : ""}
        </div>
      )}
    </div>
  );
}
