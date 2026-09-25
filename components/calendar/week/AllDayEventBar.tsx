"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { getProductCategoryIcon } from "@/lib/calendar-product-styling";
import { formatEventDayProgress } from "@/lib/calendar/mapTaskToEvents";
import type { CalendarAssignedUser, WeeklyCalendarItem } from "../weekly-calendar-types";
import { isMultiDayItem } from "./all-day-layout";

const MAX_VISIBLE_AVATARS = 3;

interface AllDayEventBarProps {
  item: WeeklyCalendarItem;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  /** Primo giorno visibile della barra, per "g X di N". */
  firstVisibleDayKey?: string;
  /** False dove il primo giorno visibile non e' noto (vista Mese): mostra "N g". */
  showDayProgress?: boolean;
  /** Calendario v2: stato (colonna Kanban) come chip neutro. */
  showStatus?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  className?: string;
}

export function getItemCollaborators(item: WeeklyCalendarItem): CalendarAssignedUser[] {
  if (item.collaborators && item.collaborators.length > 0) return item.collaborators;
  return item.assignedUser ? [item.assignedUser] : [];
}

export function CollaboratorAvatarStack({
  collaborators,
}: {
  collaborators: CalendarAssignedUser[];
}) {
  if (collaborators.length === 0) return null;
  const visible = collaborators.slice(0, MAX_VISIBLE_AVATARS);
  const hidden = collaborators.length - visible.length;
  return (
    <span className="flex shrink-0 items-center">
      {visible.map((collaborator, index) => (
        <Avatar
          key={`${collaborator.id}-${index}`}
          className="h-5 w-5 border-2 border-card"
          style={{ marginLeft: index === 0 ? 0 : -6 }}
          title={collaborator.name}
        >
          <AvatarImage src={collaborator.avatarUrl || undefined} />
          <AvatarFallback
            className="text-caption font-semibold text-primary-foreground"
            style={{ backgroundColor: collaborator.color || "#6366f1" }}
          >
            {collaborator.initials || "U"}
          </AvatarFallback>
        </Avatar>
      ))}
      {hidden > 0 && (
        <span className="ml-1 rounded-full border border-border bg-muted px-1 text-caption font-semibold text-muted-foreground">
          +{hidden}
        </span>
      )}
    </span>
  );
}

function formatTimeRange(item: WeeklyCalendarItem): string | null {
  if (item.timeStart && item.timeEnd) return `${item.timeStart}–${item.timeEnd}`;
  return item.timeStart || null;
}

/**
 * Barra della fascia giornaliera: intervallo multi-giorno (tagliato ai bordi
 * della settimana con ◂ ▸) o marcatore di scadenza di un giorno. Mai durate in
 * ore: per gli intervalli mostra il giorno di calendario ("g 29 di 47").
 */
export function AllDayEventBar({
  item,
  continuesBefore = false,
  continuesAfter = false,
  firstVisibleDayKey,
  showDayProgress = true,
  showStatus = false,
  draggable = false,
  onClick,
  className,
}: AllDayEventBarProps) {
  const canDrag = draggable && !isMultiDayItem(item);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
    disabled: !canDrag,
  });

  const isDeadline = item.eventKind === "scadenza";
  const Icon = getProductCategoryIcon(item.projectIcon || item.category || undefined);
  const progress = !isMultiDayItem(item)
    ? null
    : showDayProgress
      ? formatEventDayProgress(
          {
            startDate: item.startDate!,
            endDate: item.endDate!,
            durataGiorni: item.durationDays ?? 1,
          },
          firstVisibleDayKey ?? item.startDate!
        )
      : `${item.durationDays} g`;
  const timeRange = formatTimeRange(item);
  const collaborators = getItemCollaborators(item);
  const title = [
    item.projectNumber,
    item.projectName,
    item.startDate && item.endDate && item.startDate !== item.endDate
      ? `${item.startDate} → ${item.endDate}`
      : item.startDate,
    timeRange,
    item.status,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      ref={setNodeRef}
      title={title}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : undefined,
        touchAction: canDrag ? "none" : undefined,
        borderLeftColor: item.color || "#64748b",
      }}
      className={cn(
        "flex h-7 min-w-0 items-center gap-1.5 overflow-hidden border border-l-[3px] border-border bg-card px-1.5 text-caption text-card-foreground shadow-card",
        continuesBefore ? "rounded-l-none" : "rounded-l-control",
        continuesAfter ? "rounded-r-none border-r-0" : "rounded-r-control",
        canDrag ? "cursor-grab active:cursor-grabbing" : onClick && "cursor-pointer",
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
      {continuesBefore && (
        <span aria-label="Continua dalla settimana precedente" className="shrink-0 text-muted-foreground">
          ◂
        </span>
      )}
      {isDeadline && (
        <Flag
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: item.color || undefined }}
          aria-label="Scadenza"
        />
      )}
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-bold">{item.projectNumber || "PRO"}</span>
      <span className="min-w-0 flex-1 truncate">{item.projectName}</span>
      {timeRange && !isDeadline && (
        <span className="shrink-0 tabular-nums text-muted-foreground">{timeRange}</span>
      )}
      {progress && (
        <span className="shrink-0 rounded-sm bg-muted px-1 font-medium tabular-nums text-muted-foreground">
          {progress}
        </span>
      )}
      {showStatus && item.status && !isDeadline && (
        <span className="max-w-24 shrink-0 truncate rounded-sm bg-muted px-1 font-medium text-muted-foreground">
          {item.status}
        </span>
      )}
      {item.isLate && (
        <StatusBadge tone="late" className="shrink-0 px-1.5 py-0">
          In ritardo
        </StatusBadge>
      )}
      <CollaboratorAvatarStack collaborators={collaborators} />
      {continuesAfter && (
        <span aria-label="Continua nella settimana successiva" className="shrink-0 text-muted-foreground">
          ▸
        </span>
      )}
    </div>
  );
}
