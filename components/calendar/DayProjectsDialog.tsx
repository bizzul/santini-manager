"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { BellRing, Clock3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarProjectCard } from "./CalendarProjectCard";
import {
  buildCalendarProjectEditHref,
  formatTimeLabel,
  parseDateValue,
  type ProjectCalendarType,
} from "./calendar-utils";
import type { WeeklyCalendarItem } from "./weekly-calendar-types";

interface DayProjectsDialogProps {
  day: Date | null;
  items: WeeklyCalendarItem[];
  calendarType: ProjectCalendarType;
  domain: string;
  onClose: () => void;
}

function itemCoversDay(item: WeeklyCalendarItem, dayKey: string): boolean {
  const start = parseDateValue(item.startDatetime);
  const end = parseDateValue(item.endDatetime);
  if (!start || !end) {
    return false;
  }

  const itemStartKey = format(startOfDay(start), "yyyy-MM-dd");
  const itemEndKey = format(startOfDay(end), "yyyy-MM-dd");
  return dayKey >= itemStartKey && dayKey <= itemEndKey;
}

export function DayProjectsDialog({
  day,
  items,
  calendarType,
  domain,
  onClose,
}: DayProjectsDialogProps) {
  const router = useRouter();
  const isOpen = Boolean(day);
  const dayKey = day ? format(day, "yyyy-MM-dd") : null;

  const dayItems = useMemo(() => {
    if (!dayKey) return [];
    return items.filter((item) => itemCoversDay(item, dayKey));
  }, [dayKey, items]);

  const pendingItems = useMemo(
    () =>
      dayItems.filter((item) => (item.scheduleDisplay ?? "timed") === "time-pending"),
    [dayItems]
  );

  const timedItems = useMemo(
    () =>
      dayItems
        .filter((item) => (item.scheduleDisplay ?? "timed") !== "time-pending")
        .sort(
          (left, right) =>
            new Date(left.startDatetime).getTime() -
            new Date(right.startDatetime).getTime()
        ),
    [dayItems]
  );

  const handleItemClick = (item: WeeklyCalendarItem) => {
    const href = buildCalendarProjectEditHref(item, calendarType, domain);
    if (href) {
      router.push(href);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="capitalize">
            {day
              ? format(day, "EEEE d MMMM yyyy", { locale: it })
              : "Dettaglio giornata"}
          </DialogTitle>
          <DialogDescription>
            {dayItems.length} progetto{dayItems.length === 1 ? "" : "i"} programmat
            {dayItems.length === 1 ? "o" : "i"} per la giornata.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {pendingItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <BellRing className="h-4 w-4" />
                <span>Da definire ({pendingItems.length})</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pendingItems.map((item) => (
                  <CalendarProjectCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            </section>
          )}

          {timedItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span>Con orario ({timedItems.length})</span>
              </div>
              <div className="space-y-3">
                {timedItems.map((item) => {
                  const start = parseDateValue(item.startDatetime);
                  const end = parseDateValue(item.endDatetime);
                  if (!start || !end) {
                    return null;
                  }

                  return (
                    <div key={item.id} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatTimeLabel(start)} – {formatTimeLabel(end)}
                      </p>
                      <CalendarProjectCard
                        item={item}
                        onClick={() => handleItemClick(item)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {dayItems.length === 0 && (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              Nessun progetto programmato per questa giornata.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
