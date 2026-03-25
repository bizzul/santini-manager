"use client";

import React from "react";
import { BellRing } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getProductCategoryIcon } from "@/lib/calendar-product-styling";
import { formatTimeLabel, formatMinutesAsHours } from "./calendar-utils";
import type { PositionedCalendarItem } from "./calendar-utils";
import type { WeeklyCalendarItem } from "./weekly-calendar-types";

interface CalendarProjectCardProps {
  item: WeeklyCalendarItem | PositionedCalendarItem;
  compact?: boolean;
  onClick?: () => void;
}

export function CalendarProjectCard({
  item,
  compact = false,
  onClick,
}: CalendarProjectCardProps) {
  const Icon = getProductCategoryIcon(item.projectIcon || item.category || undefined);
  const start = new Date(item.startDatetime);
  const end = new Date(item.endDatetime);
  const scheduleDisplay = item.scheduleDisplay || "timed";
  const hasCustomDuration = item.actualHours != null || item.estimatedHours != null;
  const durationHours =
    hasCustomDuration || scheduleDisplay === "timed"
      ? item.actualHours ??
        item.estimatedHours ??
        Math.max(0.5, (end.getTime() - start.getTime()) / 3_600_000)
      : null;
  const scheduleLabel = getScheduleLabel(scheduleDisplay, start, end);
  const isTimePending = scheduleDisplay === "time-pending";

  const card = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-r-xl rounded-l-sm border-y border-r border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900",
        compact ? "h-full min-h-0 p-2" : "min-h-[116px] p-3"
      )}
      style={{
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        borderLeftColor: item.color || "#64748b",
      }}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-700",
          compact ? "pb-1.5" : "pb-2"
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                "shrink-0 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200",
                compact ? "h-3.5 w-3.5" : "h-4 w-4"
              )}
            />
            <span
              className={cn(
                "truncate font-bold text-slate-900 dark:text-slate-100",
                compact ? "text-[13px]" : "text-sm"
              )}
            >
              {item.projectNumber || "PRO"}
            </span>
          </div>
          <p
            className={cn(
              "truncate text-slate-500 dark:text-slate-400",
              compact ? "mt-0.5 text-[10px]" : "mt-1 text-xs"
            )}
          >
            {scheduleLabel}
          </p>
        </div>
        <div className={cn("flex shrink-0 flex-col items-end", compact ? "gap-0.5" : "gap-1")}>
          {isTimePending && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-amber-50 font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
                compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"
              )}
            >
              <BellRing className="h-3 w-3" />
              {compact ? "Da definire" : "Ora da definire"}
            </span>
          )}
          {item.status && (
            <Badge
              variant="secondary"
              className={cn(
                "max-w-[48%] shrink-0 truncate rounded-md bg-slate-100 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                compact ? "text-[9px]" : "text-[10px]"
              )}
            >
              {item.status}
            </Badge>
          )}
        </div>
      </div>

      <div className={cn(compact ? "mt-1.5 space-y-1" : "mt-2 space-y-2")}>
        <p
          className={cn(
            "font-semibold text-slate-800 dark:text-slate-100",
            compact ? "line-clamp-2 text-[13px]" : "line-clamp-2 text-[15px]"
          )}
        >
          {item.projectName}
        </p>

        {(item.category || item.activityType) && (
          <div
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
            )}
          >
            <span className="truncate">{item.category || item.activityType}</span>
          </div>
        )}
      </div>

      <div className={cn("flex items-center justify-between gap-2", compact ? "mt-2" : "mt-3")}>
        <div className="min-w-0">
          {item.assignedUser ? (
            <div className="flex items-center gap-2">
              <Avatar
                className={cn(
                  "border border-slate-200 dark:border-slate-700",
                  compact ? "h-5 w-5" : "h-6 w-6"
                )}
              >
                <AvatarImage src={item.assignedUser.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px] font-semibold">
                  {item.assignedUser.initials || "U"}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "truncate text-slate-600 dark:text-slate-300",
                  compact ? "text-[10px]" : "text-xs"
                )}
              >
                {item.assignedUser.name}
              </span>
            </div>
          ) : (
            <span className={cn("text-slate-400 dark:text-slate-500", compact ? "text-[10px]" : "text-xs")}>
              Nessun collaboratore
            </span>
          )}
        </div>

        {durationHours !== null ? (
          <div
            className={cn(
              "shrink-0 rounded-md bg-slate-50 font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
              compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
            )}
          >
            {formatMinutesAsHours(Math.round(durationHours * 60))}
          </div>
        ) : (
          <div
            className={cn(
              "shrink-0 font-medium text-slate-400 dark:text-slate-500",
              compact ? "text-[10px]" : "text-[11px]"
            )}
          >
            {scheduleDisplay === "date-only" ? "Solo giorno" : "Da pianificare"}
          </div>
        )}
      </div>
    </button>
  );

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{item.projectNumber || "PRO"}</span>
              {isTimePending && (
                <Badge
                  variant="outline"
                  className="border-amber-200 text-amber-700 dark:border-amber-900/70 dark:text-amber-200"
                >
                  <BellRing className="mr-1 h-3 w-3" />
                  Ora da definire
                </Badge>
              )}
              {item.status && <Badge variant="outline">{item.status}</Badge>}
            </div>
            <p className="text-sm font-medium">{item.projectName}</p>
            <p className="text-xs text-muted-foreground">
              {scheduleLabel}
              {durationHours !== null && (
                <>
                  {" "}
                  • {formatMinutesAsHours(Math.round(durationHours * 60))}
                </>
              )}
            </p>
          </div>
          {item.assignedUser && (
            <p className="text-xs">Collaboratore: {item.assignedUser.name}</p>
          )}
          {(item.category || item.activityType) && (
            <p className="text-xs">Tipo: {item.category || item.activityType}</p>
          )}
          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getScheduleLabel(
  scheduleDisplay: "timed" | "time-pending" | "date-only",
  start: Date,
  end: Date
): string {
  if (scheduleDisplay === "time-pending") {
    return "Orario da definire";
  }

  if (scheduleDisplay === "date-only") {
    return "Entro il giorno pianificato";
  }

  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}
