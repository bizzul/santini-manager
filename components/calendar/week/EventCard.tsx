"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { CalendarProjectCard } from "../CalendarProjectCard";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";
import { isMultiDayItem } from "./all-day-layout";

export type EventCardVariant = "full" | "split" | "mini";

interface EventCardProps {
  item: WeeklyCalendarItem;
  variant?: EventCardVariant;
  draggable?: boolean;
  isConflict?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Wrapper trascinabile (@dnd-kit) attorno a CalendarProjectCard.
 * Mantiene badge/colori/ore della card esistente; aggiunge varianti di densità
 * e fallback da tastiera (sensori gestiti dal DndContext del WeekCalendar).
 */
export function EventCard({
  item,
  variant = "full",
  draggable = true,
  isConflict = false,
  onClick,
  className,
}: EventCardProps) {
  const canDrag = draggable && !isMultiDayItem(item);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { item },
      disabled: !canDrag,
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
    touchAction: "none",
  };

  if (variant === "mini") {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, borderLeftColor: item.color || "#64748b" }}
        className={cn(
          "h-2.5 w-full rounded-sm border-l-4 bg-card shadow-sm transition-colors",
          isConflict && "ring-1 ring-destructive/60",
          canDrag && "cursor-grab active:cursor-grabbing",
          className
        )}
        title={`${item.projectNumber || ""} ${item.projectName}`.trim()}
        {...(canDrag ? attributes : {})}
        {...(canDrag ? listeners : {})}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "h-full min-h-0",
        canDrag && "cursor-grab active:cursor-grabbing",
        isConflict && "rounded-xl ring-2 ring-destructive/70",
        className
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      {...(onClick && !canDrag ? { role: "button" as const, tabIndex: 0 } : {})}
    >
      <CalendarProjectCard item={item} compact readOnly />
    </div>
  );
}
