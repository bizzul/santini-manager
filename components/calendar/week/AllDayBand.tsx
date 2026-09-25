"use client";

import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { makeAllDayDroppableId } from "@/lib/calendar-drag";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";
import { AllDayEventBar } from "./AllDayEventBar";
import { layoutAllDaySegments } from "./all-day-layout";

const LANE_HEIGHT_PX = 30;

function AllDayDropCell({ dayKey, column }: { dayKey: string; column: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: makeAllDayDroppableId(dayKey) });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-l border-border/60 transition-colors",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary/40"
      )}
      style={{ gridColumn: column, gridRow: "1 / -1" }}
    />
  );
}

interface AllDayBandProps {
  items: WeeklyCalendarItem[];
  dayKeys: string[];
  /** Tracce CSS delle sole colonne-giorno (senza la colonna orari). */
  dayTracks: string;
  /** Registra ogni giorno come drop target "giorno intero". */
  droppable?: boolean;
  draggable?: boolean;
  showStatus?: boolean;
  onItemClick?: (item: WeeklyCalendarItem) => void;
}

/** Fascia giornaliera (all-day) sopra la griglia: una riga per corsia di barre. */
export function AllDayBand({
  items,
  dayKeys,
  dayTracks,
  droppable = false,
  draggable = false,
  showStatus = false,
  onItemClick,
}: AllDayBandProps) {
  const { segments, laneCount } = useMemo(
    () => layoutAllDaySegments(items, dayKeys),
    [items, dayKeys]
  );
  const rows = Math.max(1, laneCount);

  return (
    <div
      className="grid py-0.5"
      style={{
        gridTemplateColumns: dayTracks,
        gridTemplateRows: `repeat(${rows}, ${LANE_HEIGHT_PX}px)`,
      }}
    >
      {droppable &&
        dayKeys.map((dayKey, index) => (
          <AllDayDropCell key={dayKey} dayKey={dayKey} column={index + 1} />
        ))}
      {segments.map((segment) => (
        <div
          key={segment.item.id}
          className="z-10 min-w-0 px-0.5 py-0.5"
          style={{
            gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
            gridRow: segment.lane + 1,
          }}
        >
          <AllDayEventBar
            item={segment.item}
            continuesBefore={segment.continuesBefore}
            continuesAfter={segment.continuesAfter}
            firstVisibleDayKey={segment.firstVisibleDayKey}
            draggable={draggable}
            showStatus={showStatus}
            onClick={onItemClick ? () => onItemClick(segment.item) : undefined}
          />
        </div>
      ))}
    </div>
  );
}
