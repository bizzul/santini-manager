"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { makeAllDayDroppableId } from "@/lib/calendar-drag";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";
import { AllDayEventBar } from "./AllDayEventBar";
import { EventCard } from "./EventCard";

interface CompactDayColumnProps {
  dayKey: string;
  /** Eventi di un solo giorno, gia' ordinati. */
  items: WeeklyCalendarItem[];
  /** Colonna stretta (weekend compresso): solo indicatori. */
  isMini?: boolean;
  isToday?: boolean;
  draggable?: boolean;
  onItemClick?: (item: WeeklyCalendarItem) => void;
  onMiniClick?: () => void;
}

/**
 * Colonna-giorno della settimana compatta (Produzione, Posa): nessuna griglia
 * oraria, card impilate. L'intera colonna e' un drop target "giorno intero".
 */
export function CompactDayColumn({
  dayKey,
  items,
  isMini = false,
  isToday = false,
  draggable = true,
  onItemClick,
  onMiniClick,
}: CompactDayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: makeAllDayDroppableId(dayKey) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-96 border-l border-border/60 transition-colors",
        isMini ? "space-y-1 px-0.5 py-1" : "space-y-1.5 p-1.5",
        isToday && "bg-primary/5",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary/40"
      )}
      onClick={isMini ? onMiniClick : undefined}
    >
      {items.map((item) =>
        isMini ? (
          <EventCard key={item.id} item={item} variant="mini" draggable={draggable} />
        ) : item.eventKind === "scadenza" ? (
          <AllDayEventBar
            key={item.id}
            item={item}
            draggable={draggable}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          />
        ) : (
          <EventCard
            key={item.id}
            item={item}
            variant="split"
            draggable={draggable}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
          />
        )
      )}
    </div>
  );
}
