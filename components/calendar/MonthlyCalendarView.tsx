"use client";

import React, { useMemo, useState } from "react";
import { addMonths, format, isSameMonth, isToday, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import {
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarProjectCard } from "./CalendarProjectCard";
import { ProjectOrSiteDetailDrawer } from "./ProjectOrSiteDetailDrawer";
import { CalendarLegend } from "./WeeklyCalendarView";
import {
  applyCalendarFilters,
  createDefaultFilters,
  filterItemsForMonth,
  getBusinessMonthWeeks,
  getStatusLegend,
  sortCalendarItemsForDay,
  type ProjectCalendarType,
} from "./calendar-utils";
import type {
  CalendarFilterOption,
  WeeklyCalendarFilters,
  WeeklyCalendarItem,
  WeeklyCalendarTimetrackingEditConfig,
  WeeklyCalendarTimetrackingEntry,
} from "./weekly-calendar-types";

interface MonthlyCalendarViewProps {
  items: WeeklyCalendarItem[];
  title: string;
  description?: string;
  mode?: "personal" | "admin";
  currentUserId?: string;
  calendarType?: ProjectCalendarType;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  timetrackingEditConfig?: WeeklyCalendarTimetrackingEditConfig;
}

export function MonthlyCalendarView({
  items,
  title,
  description,
  mode = "personal",
  currentUserId,
  calendarType = "installation",
  emptyStateTitle = "Nessun progetto pianificato nel mese",
  emptyStateDescription = "Le card compariranno qui appena i progetti avranno una data pianificata.",
  timetrackingEditConfig,
}: MonthlyCalendarViewProps) {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [filters, setFilters] = useState<WeeklyCalendarFilters>(
    createDefaultFilters(mode === "personal")
  );
  const [selectedItem, setSelectedItem] = useState<WeeklyCalendarItem | null>(null);

  const monthItems = useMemo(
    () => filterItemsForMonth(items, monthStart),
    [items, monthStart]
  );

  const filterOptions = useMemo(() => {
    const collaborators = new Map<string, string>();
    const projects = new Map<string, string>();
    const sites = new Map<string, string>();
    const statuses = new Set<string>();
    const activityTypes = new Set<string>();

    monthItems.forEach((item) => {
      if (item.assignedUser?.id) {
        collaborators.set(item.assignedUser.id, item.assignedUser.name);
      }
      if (item.projectId || item.projectNumber) {
        const key = String(item.projectId || item.projectNumber);
        const label = item.projectNumber
          ? `${item.projectNumber} - ${item.projectName}`
          : item.projectName;
        projects.set(key, label);
      }
      if (item.siteId || item.cantiereId) {
        const siteKey = String(item.siteId || item.cantiereId);
        sites.set(
          siteKey,
          String(item.metadata?.siteName || item.metadata?.location || siteKey)
        );
      }
      if (item.status) statuses.add(item.status);
      if (item.activityType) activityTypes.add(item.activityType);
      if (item.category) activityTypes.add(item.category);
    });

    return {
      collaborators: toOptions(collaborators),
      projects: toOptions(projects),
      sites: toOptions(sites),
      statuses: Array.from(statuses)
        .sort((left, right) => left.localeCompare(right, "it"))
        .map((value) => ({ value, label: value })),
      activityTypes: Array.from(activityTypes)
        .sort((left, right) => left.localeCompare(right, "it"))
        .map((value) => ({ value, label: value })),
    };
  }, [monthItems]);

  const filteredItems = useMemo(
    () => applyCalendarFilters(monthItems, filters, currentUserId),
    [monthItems, filters, currentUserId]
  );

  const legendItems = useMemo(() => getStatusLegend(filteredItems), [filteredItems]);
  const pendingTimeCount = useMemo(
    () => filteredItems.filter((item) => item.scheduleDisplay === "time-pending").length,
    [filteredItems]
  );
  const weeks = useMemo(() => getBusinessMonthWeeks(monthStart), [monthStart]);
  const desktopGridHeight = useMemo(
    () => `min(calc(100dvh - 20rem), ${Math.max(weeks.length * 10.5, 32)}rem)`,
    [weeks.length]
  );
  const itemsByDay = useMemo(() => {
    const grouped = new Map<string, WeeklyCalendarItem[]>();

    filteredItems.forEach((item) => {
      const key = format(new Date(item.startDatetime), "yyyy-MM-dd");
      const bucket = grouped.get(key) || [];
      bucket.push(item);
      grouped.set(key, bucket);
    });

    grouped.forEach((bucket) => bucket.sort(sortCalendarItemsForDay));

    return grouped;
  }, [filteredItems]);
  const selectedTimetrackingEntry = useMemo<WeeklyCalendarTimetrackingEntry | null>(() => {
    if (!selectedItem?.sourceId || !timetrackingEditConfig) {
      return null;
    }

    return (
      timetrackingEditConfig.entries.find(
        (entry) => String(entry.id) === String(selectedItem.sourceId)
      ) || null
    );
  }, [selectedItem, timetrackingEditConfig]);

  const isProductionCalendar = calendarType === "production" || calendarType === "all";
  const monthLabel = capitalize(format(monthStart, "MMMM yyyy", { locale: it }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{title}</h2>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonthStart((current) => addMonths(current, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setMonthStart(startOfMonth(new Date()))}
            >
              <TimerReset className="mr-2 h-4 w-4" />
              Questo mese
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonthStart((current) => addMonths(current, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {monthLabel}
            </Badge>
            <Badge variant="outline">
              {filteredItems.length} card{filteredItems.length === 1 ? "a" : ""}
            </Badge>
            {!isProductionCalendar && pendingTimeCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <BellRing className="mr-1.5 h-3.5 w-3.5" />
                {pendingTimeCount} con orario da definire
              </Badge>
            )}
          </div>

        </div>
      </div>

      {legendItems.length > 0 && <CalendarLegend items={legendItems} />}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden xl:block">
            <div className="grid grid-cols-5 border-b bg-muted/20">
              {weeks[0]?.map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-r px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
                >
                  {format(day, "EEEE", { locale: it })}
                </div>
              ))}
            </div>

            <div
              className="grid gap-px bg-border"
              style={{
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))`,
                height: desktopGridHeight,
              }}
            >
              {weeks.flat().map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayItems = itemsByDay.get(dayKey) || [];
                const isCurrentMonth = isSameMonth(day, monthStart);

                return (
                  <MonthDayCell
                    key={dayKey}
                    day={day}
                    items={dayItems}
                    isCurrentMonth={isCurrentMonth}
                    showPlaceholder={isCurrentMonth}
                    onItemClick={setSelectedItem}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-4 p-4 xl:hidden">
            {weeks.flat().map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayItems = itemsByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <MonthDayCell
                  key={dayKey}
                  day={day}
                  items={dayItems}
                  isCurrentMonth={isCurrentMonth}
                  showPlaceholder={isCurrentMonth}
                  onItemClick={setSelectedItem}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-semibold">{emptyStateTitle}</p>
              <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ProjectOrSiteDetailDrawer
        item={selectedItem}
        open={Boolean(selectedItem)}
        editableTimetrackingEntry={selectedTimetrackingEntry}
        editUsers={timetrackingEditConfig?.users}
        editRoles={timetrackingEditConfig?.roles}
        editTasks={timetrackingEditConfig?.tasks}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      />
    </div>
  );
}

function MonthDayCell({
  day,
  items,
  isCurrentMonth,
  showPlaceholder,
  onItemClick,
}: {
  day: Date;
  items: WeeklyCalendarItem[];
  isCurrentMonth: boolean;
  showPlaceholder: boolean;
  onItemClick: (item: WeeklyCalendarItem) => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-card p-2 xl:p-2.5",
        !isCurrentMonth && "bg-muted/15 text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "mb-2 flex items-center justify-between rounded-lg border px-2.5 py-1.5",
          isToday(day) && "border-primary/40 bg-primary/5",
          !isCurrentMonth && "border-dashed bg-transparent"
        )}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {format(day, "EEE", { locale: it })}
          </p>
          <p className={cn("text-sm font-semibold", !isCurrentMonth && "opacity-70")}>
            {format(day, "d MMM", { locale: it })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && <Badge variant="outline">{items.length}</Badge>}
          {isToday(day) && <Badge>Oggi</Badge>}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <CalendarProjectCard
              key={item.id}
              item={item}
              compact
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
      ) : showPlaceholder ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed px-2 py-3 text-center text-xs text-muted-foreground">
          Nessun progetto pianificato
        </div>
      ) : null}
    </div>
  );
}

function toOptions(map: Map<string, string>): CalendarFilterOption[] {
  return Array.from(map.entries())
    .sort((left, right) => left[1].localeCompare(right[1], "it"))
    .map(([value, label]) => ({ value, label }));
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
