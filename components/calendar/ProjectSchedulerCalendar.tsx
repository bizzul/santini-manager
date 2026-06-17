"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  LayoutGrid,
  ListFilter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarProjectCard } from "./CalendarProjectCard";
import { DayProjectsDialog } from "./DayProjectsDialog";
import { WeekCalendar } from "./week/WeekCalendar";
import { ResourceView } from "./week/ResourceView";
import {
  buildCalendarProjectEditHref,
  buildDateOnlyPayload,
  buildSchedulePayload,
  getStatusLegend,
  parseDateValue,
  type ProjectCalendarType,
} from "./calendar-utils";
import type { WeeklyCalendarItem } from "./weekly-calendar-types";
import { toast } from "@/lib/toast";

type FullCalendarBundle = {
  FullCalendar: React.ComponentType<Record<string, unknown>>;
  scrollGridPlugin: unknown;
  timeGridPlugin: unknown;
  dayGridPlugin: unknown;
  interactionPlugin: unknown;
  itLocale: unknown;
};

export type CalendarViewMode = "week" | "month" | "resource";

interface ProjectSchedulerCalendarProps {
  items: WeeklyCalendarItem[];
  calendarType: ProjectCalendarType;
  domain: string;
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  title: string;
  description?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

function CalendarViewSwitcher({
  view,
  onViewChange,
}: {
  view: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
}) {
  const options: Array<{ value: CalendarViewMode; label: string }> = [
    { value: "week", label: "Settimana operativa" },
    { value: "resource", label: "Per risorsa" },
    { value: "month", label: "Mese" },
  ];

  return (
    <div className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={view === option.value ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-8 px-3 text-sm",
            view !== option.value && "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onViewChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function itemsToEvents(items: WeeklyCalendarItem[]): EventInput[] {
  const events: EventInput[] = [];

  items.forEach((item) => {
    if (!isTimedCalendarItem(item)) {
      return;
    }

    if (!parseDateValue(item.startDatetime) || !parseDateValue(item.endDatetime)) {
      return;
    }

    events.push({
      id: item.id,
      title: item.projectNumber || item.projectName,
      start: item.startDatetime,
      end: item.endDatetime,
      allDay: false,
      extendedProps: { item },
      backgroundColor: "transparent",
      borderColor: item.color || "#64748b",
      textColor: "inherit",
    });
  });

  return events;
}

function isTimedCalendarItem(item: WeeklyCalendarItem): boolean {
  return (item.scheduleDisplay ?? "timed") !== "time-pending";
}

function updateItemSchedule(
  items: WeeklyCalendarItem[],
  itemId: string,
  start: Date,
  end: Date
): WeeklyCalendarItem[] {
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          startDatetime: start.toISOString(),
          endDatetime: end.toISOString(),
          scheduleDisplay: "timed" as const,
        }
      : item
  );
}

function updateItemToDateOnly(
  items: WeeklyCalendarItem[],
  itemId: string,
  day: Date
): WeeklyCalendarItem[] {
  const dayStart = new Date(day);
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(8, 0, 0, 0);
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          startDatetime: dayStart.toISOString(),
          endDatetime: dayEnd.toISOString(),
          scheduleDisplay: "time-pending" as const,
        }
      : item
  );
}

export function ProjectSchedulerCalendar({
  items,
  calendarType,
  domain,
  view,
  onViewChange,
  title,
  description,
  emptyStateTitle = "Nessun progetto pianificato",
  emptyStateDescription = "Le card compariranno qui quando i progetti avranno date e orari.",
}: ProjectSchedulerCalendarProps) {
  const router = useRouter();
  const calendarRef = useRef<{
    getApi: () => { changeView: (view: string) => void; updateSize: () => void };
  } | null>(null);
  const [bundle, setBundle] = useState<FullCalendarBundle | null>(null);
  const [calendarItems, setCalendarItems] = useState(items);
  const [isSaving, setIsSaving] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  useEffect(() => {
    setCalendarItems(items);
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [
          { default: FullCalendar },
          { default: scrollGridPlugin },
          { default: timeGridPlugin },
          { default: dayGridPlugin },
          { default: interactionPlugin },
        ] = await Promise.all([
          import("@fullcalendar/react"),
          import("@fullcalendar/scrollgrid"),
          import("@fullcalendar/timegrid"),
          import("@fullcalendar/daygrid"),
          import("@fullcalendar/interaction"),
        ]);

        let itLocale = null;
        try {
          const localeModule = await import("@fullcalendar/core/locales/it");
          itLocale = localeModule.default;
        } catch {
          // ignore missing locale bundle
        }

        if (!cancelled) {
          setBundle({
            FullCalendar,
            scrollGridPlugin,
            timeGridPlugin,
            dayGridPlugin,
            interactionPlugin,
            itLocale,
          });
        }
      } catch (error) {
        console.error("Failed to load FullCalendar:", error);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePendingItemClick = useCallback(
    (item: WeeklyCalendarItem) => {
      const href = buildCalendarProjectEditHref(item, calendarType, domain);
      if (href) {
        router.push(href);
      }
    },
    [calendarType, domain, router]
  );

  const events = useMemo(() => itemsToEvents(calendarItems), [calendarItems]);
  const legendItems = useMemo(() => getStatusLegend(calendarItems), [calendarItems]);

  const persistSchedule = useCallback(
    async (item: WeeklyCalendarItem, start: Date, end: Date, revert?: () => void) => {
      if (!item.sourceId || !start || !end || end <= start) {
        revert?.();
        return;
      }

      const previousItems = calendarItems;
      setCalendarItems((current) =>
        updateItemSchedule(current, item.id, start, end)
      );
      setIsSaving(true);

      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        };

        const response = await fetch(`/api/kanban/tasks/${item.sourceId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(buildSchedulePayload(calendarType, start, end)),
        });

        if (!response.ok) {
          throw new Error("Aggiornamento non riuscito");
        }

        toast.success("Pianificazione aggiornata", {
          description: `${item.projectNumber || item.projectName} spostato correttamente.`,
        });
        router.refresh();
      } catch (error) {
        console.error("Calendar reschedule failed:", error);
        setCalendarItems(previousItems);
        revert?.();
        toast.error("Impossibile aggiornare la pianificazione", {
          description: "Riprova o modifica la scheda progetto.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [calendarItems, calendarType, domain, router]
  );

  const persistDateOnly = useCallback(
    async (item: WeeklyCalendarItem, day: Date) => {
      if (!item.sourceId) return;

      const previousItems = calendarItems;
      setCalendarItems((current) =>
        updateItemToDateOnly(current, item.id, day)
      );
      setIsSaving(true);

      try {
        const response = await fetch(`/api/kanban/tasks/${item.sourceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-site-domain": domain,
          },
          body: JSON.stringify(buildDateOnlyPayload(calendarType, day)),
        });

        if (!response.ok) {
          throw new Error("Aggiornamento non riuscito");
        }

        toast.success("Giorno assegnato", {
          description: `${item.projectNumber || item.projectName}: orario ancora da definire.`,
        });
        router.refresh();
      } catch (error) {
        console.error("Calendar day-assign failed:", error);
        setCalendarItems(previousItems);
        toast.error("Impossibile assegnare il giorno", {
          description: "Riprova o modifica la scheda progetto.",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [calendarItems, calendarType, domain, router]
  );

  const handleWeekReschedule = useCallback(
    (item: WeeklyCalendarItem, start: Date, end: Date) => {
      void persistSchedule(item, start, end);
    },
    [persistSchedule]
  );

  const handleWeekAssignDay = useCallback(
    (item: WeeklyCalendarItem, day: Date) => {
      void persistDateOnly(item, day);
    },
    [persistDateOnly]
  );

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      if (info.event.allDay) {
        info.revert();
        return;
      }

      const item = info.event.extendedProps.item as WeeklyCalendarItem | undefined;
      const start = info.event.start;
      const end = info.event.end;
      if (!item || !start || !end) {
        info.revert();
        return;
      }
      void persistSchedule(item, start, end, info.revert);
    },
    [persistSchedule]
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      if (info.event.allDay) {
        info.revert();
        return;
      }

      const item = info.event.extendedProps.item as WeeklyCalendarItem | undefined;
      const start = info.event.start;
      const end = info.event.end;
      if (!item || !start || !end) {
        info.revert();
        return;
      }
      void persistSchedule(item, start, end, info.revert);
    },
    [persistSchedule]
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const item = info.event.extendedProps.item as WeeklyCalendarItem | undefined;
      if (!item) return;

      const href = buildCalendarProjectEditHref(item, calendarType, domain);
      if (href) {
        router.push(href);
      }
    },
    [calendarType, domain, router]
  );

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const item = arg.event.extendedProps.item as WeeklyCalendarItem | undefined;
    if (!item) return null;

    return (
      <div className="h-full min-h-0 overflow-hidden">
        <CalendarProjectCard
          item={{
            ...item,
            startDatetime: arg.event.start?.toISOString() || item.startDatetime,
            endDatetime: arg.event.end?.toISOString() || item.endDatetime,
          }}
          compact
          readOnly
        />
      </div>
    );
  }, []);

  const handleEventsSet = useCallback(() => {
    const overlaps = new Set<string>();
    const timedItems = calendarItems.filter(isTimedCalendarItem);
    const sorted = [...timedItems].sort(
      (left, right) =>
        new Date(left.startDatetime).getTime() -
        new Date(right.startDatetime).getTime()
    );

    sorted.forEach((item, index) => {
      const start = new Date(item.startDatetime).getTime();
      const end = new Date(item.endDatetime).getTime();
      for (let compareIndex = index + 1; compareIndex < sorted.length; compareIndex += 1) {
        const other = sorted[compareIndex];
        const otherStart = new Date(other.startDatetime).getTime();
        const otherEnd = new Date(other.endDatetime).getTime();
        if (otherStart >= end) break;
        if (otherStart < end && otherEnd > start) {
          overlaps.add(item.id);
          overlaps.add(other.id);
        }
      }
    });

    setConflictCount(overlaps.size);
  }, [calendarItems]);

  const isWeekView = view === "week";
  const isResourceView = view === "resource";
  const isGridView = isWeekView || isResourceView;

  if (view === "month" && !bundle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Caricamento calendario...
        </CardContent>
      </Card>
    );
  }

  const FullCalendar = bundle?.FullCalendar;
  const scrollGridPlugin = bundle?.scrollGridPlugin;
  const timeGridPlugin = bundle?.timeGridPlugin;
  const dayGridPlugin = bundle?.dayGridPlugin;
  const interactionPlugin = bundle?.interactionPlugin;
  const itLocale = bundle?.itLocale;

  return (
    <div
      className={cn(
        isGridView ? "flex h-full min-h-0 flex-col gap-2" : "space-y-4"
      )}
    >
      <style jsx global>{`
        .project-scheduler-calendar .fc {
          --fc-border-color: hsl(var(--border));
          --fc-page-bg-color: hsl(var(--card));
          --fc-neutral-bg-color: hsl(var(--muted) / 0.35);
          --fc-today-bg-color: hsl(var(--primary) / 0.08);
          --fc-event-border-color: hsl(var(--border));
          --fc-now-indicator-color: hsl(var(--destructive));
          font-family: inherit;
        }
        .project-scheduler-calendar .fc .fc-toolbar-title {
          font-size: 1rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .project-scheduler-calendar .fc .fc-button {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
          box-shadow: none;
        }
        .project-scheduler-calendar .fc .fc-button:hover,
        .project-scheduler-calendar .fc .fc-button:focus {
          background: hsl(var(--accent));
          border-color: hsl(var(--border));
          color: hsl(var(--accent-foreground));
        }
        .project-scheduler-calendar .fc .fc-button-primary:not(:disabled).fc-button-active,
        .project-scheduler-calendar .fc .fc-button-primary:not(:disabled):active {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .project-scheduler-calendar .fc-theme-standard td,
        .project-scheduler-calendar .fc-theme-standard th {
          border-color: hsl(var(--border));
        }
        .project-scheduler-calendar .fc-col-header-cell,
        .project-scheduler-calendar .fc-timegrid-axis,
        .project-scheduler-calendar .fc-scrollgrid {
          background: hsl(var(--card));
        }
        .project-scheduler-calendar .fc-timegrid-slot-label,
        .project-scheduler-calendar .fc-timegrid-axis-cushion {
          color: hsl(var(--muted-foreground));
          font-size: 0.7rem;
        }
        .project-scheduler-calendar .fc-timegrid-slot-minor {
          border-top-style: dashed;
          border-top-color: hsl(var(--border) / 0.45);
        }
        .project-scheduler-calendar .fc-event {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 1px 2px !important;
        }
        .project-scheduler-calendar .fc-event-main {
          padding: 0 !important;
          overflow: hidden;
        }
        .project-scheduler-calendar .fc-timegrid-event {
          min-height: 0;
        }
        .project-scheduler-calendar--week .fc {
          height: 100%;
        }
        .project-scheduler-calendar--week .fc-scrollgrid {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }
        .project-scheduler-calendar .fc-event-resizer {
          width: 100%;
          height: 8px;
          background: hsl(var(--primary) / 0.35);
        }
      `}</style>

      <div className="flex shrink-0 flex-col gap-4 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CalendarViewSwitcher view={view} onViewChange={onViewChange} />
            <Badge variant="outline">
              {calendarItems.length} card{calendarItems.length === 1 ? "" : ""}
            </Badge>
            {conflictCount > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                {conflictCount} conflitt{conflictCount === 1 ? "o" : "i"}
              </Badge>
            )}
            {isSaving && (
              <Badge variant="secondary">
                <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                Salvataggio...
              </Badge>
            )}
          </div>
        </div>
      </div>

      {legendItems.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListFilter className="h-4 w-4" />
            <span>Legenda</span>
          </div>
          {legendItems.map((item) => (
            <Badge key={item.label} variant="outline" className="gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </Badge>
          ))}
        </div>
      )}

      <Card
        className={cn(
          "project-scheduler-calendar min-w-0",
          isGridView && "project-scheduler-calendar--week flex min-h-0 flex-1 flex-col overflow-hidden"
        )}
      >
        <CardContent
          className={cn(
            "gap-3 p-3 sm:p-4",
            isGridView && "flex min-h-0 flex-1 flex-col"
          )}
        >
          {isWeekView ? (
            <WeekCalendar
              items={calendarItems}
              onItemClick={handlePendingItemClick}
              onReschedule={handleWeekReschedule}
              onAssignDay={handleWeekAssignDay}
              onConflictCountChange={setConflictCount}
            />
          ) : isResourceView ? (
            <ResourceView
              items={calendarItems}
              onItemClick={handlePendingItemClick}
            />
          ) : FullCalendar ? (
            <FullCalendar
              ref={calendarRef}
              plugins={[
                scrollGridPlugin,
                timeGridPlugin,
                dayGridPlugin,
                interactionPlugin,
              ]}
              initialView="dayGridMonth"
              locale={itLocale || "it"}
              firstDay={1}
              weekends
              allDaySlot={false}
              slotMinTime="07:00:00"
              slotMaxTime="18:00:00"
              slotDuration="00:15:00"
              slotLabelInterval="01:00:00"
              snapDuration="00:15:00"
              scrollTime="07:00:00"
              nowIndicator
              editable
              eventDurationEditable
              eventResizableFromStart
              eventStartEditable
              events={events}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              datesSet={handleEventsSet}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              height="auto"
              dayMaxEvents={4}
              moreLinkClick="popover"
              eventOverlap
              selectMirror={false}
              longPressDelay={150}
              eventLongPressDelay={150}
            />
          ) : null}
        </CardContent>
      </Card>

      <DayProjectsDialog
        day={expandedDay}
        items={calendarItems}
        calendarType={calendarType}
        domain={domain}
        onClose={() => setExpandedDay(null)}
      />

      {calendarItems.length === 0 && (
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
    </div>
  );
}
