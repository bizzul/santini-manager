"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getEventStyleFromProduct,
  getProductCategoryIcon,
} from "@/lib/calendar-product-styling";
import { CalendarSummaryBar } from "./CalendarSummaryBar";
import type { TaskWithKanban } from "./calendarComponent";
import { matchesCalendarType } from "./calendarComponent";

const RESOURCES = [
  { id: "squadra-1", title: "Squadra 1" },
  { id: "squadra-2", title: "Squadra 2" },
];

function parseTimeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = String(timeStr).trim().split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return h * 60 + m;
}

function buildDateTime(date: Date, timeStr: string | null | undefined, defaultHour: number, defaultMin: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (timeStr) {
    const mins = parseTimeToMinutes(timeStr);
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  } else {
    d.setHours(defaultHour, defaultMin, 0, 0);
  }
  return d;
}

function EventTooltipContent({ task }: { task: TaskWithKanban | null }) {
  if (!task) return null;
  const deliveryStr = task.deliveryDate
    ? new Date(task.deliveryDate).toLocaleDateString("it-CH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";
  const oraInizio = (task as any).ora_inizio;
  const oraFine = (task as any).ora_fine;
  return (
    <div className="space-y-1.5 p-1 min-w-[200px]">
      <div className="font-semibold text-sm">{task.unique_code}</div>
      {(task.title || task.name) && (
        <div className="text-xs">
          <span className="text-muted-foreground">Progetto: </span>
          {task.title || task.name}
        </div>
      )}
      {task.luogo && (
        <div className="text-xs">
          <span className="text-muted-foreground">Luogo: </span>
          {task.luogo}
        </div>
      )}
      <div className="text-xs">
        <span className="text-muted-foreground">Data: </span>
        {deliveryStr}
      </div>
      {(oraInizio || oraFine) && (
        <div className="text-xs">
          <span className="text-muted-foreground">Orario: </span>
          {oraInizio || "—"} - {oraFine || "—"}
        </div>
      )}
      <div className="text-xs text-muted-foreground pt-1 border-t">
        Clicca per aprire il progetto
      </div>
    </div>
  );
}

const CALENDAR_TYPE_NAMES: Record<string, string> = {
  installation: "Calendario Posa",
  service: "Calendario Service",
};

const MONTH_NAMES = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

function fixCalendarTitle(text: string): string {
  if (!text?.trim()) return text;
  return text.trim().split(" ").map((word) => {
    const lower = word.toLowerCase();
    if (MONTH_NAMES.includes(lower)) {
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }
    return word;
  }).join(" ");
}

export default function CalendarTimeView({
  tasks,
  calendarType,
  domain,
}: {
  tasks: TaskWithKanban[];
  calendarType: "installation" | "service";
  domain?: string;
}) {
  const router = useRouter();
  const params = useParams();
  const effectiveDomain = domain ?? (params?.domain as string);
  const [mounted, setMounted] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [dateRange, setDateRange] = useState<{
    weekStart: Date | null;
    weekEnd: Date | null;
    monthStart: Date | null;
    monthEnd: Date | null;
  }>({ weekStart: null, weekEnd: null, monthStart: null, monthEnd: null });
  const calendarRef = useRef<any>(null);
  const [components, setComponents] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          { default: FullCalendar },
          { default: resourceTimelinePlugin },
        ] = await Promise.all([
          import("@fullcalendar/react"),
          import("@fullcalendar/resource-timeline"),
        ]);
        let itLocale = null;
        try {
          const localeModule = await import("@fullcalendar/core/locales/it");
          itLocale = localeModule.default;
        } catch {
          // ignore
        }
        setComponents({ FullCalendar, resourceTimelinePlugin, itLocale });
        setMounted(true);
      } catch (err) {
        console.error("Calendar load error:", err);
        setMounted(true);
      }
    };
    load();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (!t.deliveryDate || !t.unique_code) return false;
    return matchesCalendarType(t.Kanban ?? null, calendarType);
  });

  const events = filteredTasks.map((task) => {
    const date = new Date(task.deliveryDate!);
    const oraInizio = (task as any).ora_inizio;
    const oraFine = (task as any).ora_fine;
    const start = buildDateTime(date, oraInizio, 8, 0);
    let end = buildDateTime(date, oraFine, 12, 0);
    if (end <= start) {
      end = new Date(start);
      end.setHours(12, 0, 0, 0);
    }

    const squadra = (task as any).squadra;
    const resourceId = squadra === 2 ? "squadra-2" : "squadra-1";

    const kanbanColor = task.Kanban?.color || "#1e293b";
    const style = getEventStyleFromProduct(task, kanbanColor);

    const projectName = task.title || task.name;
    const displayTitle = projectName
      ? `${task.unique_code} - ${projectName}`
      : task.unique_code!;

    return {
      title: displayTitle,
      start: start.toISOString(),
      end: end.toISOString(),
      resourceId,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      textColor: style.textColor,
      extendedProps: { taskId: task.id, task },
    };
  });

  const renderEventContent = useCallback((eventInfo: any) => {
    const task = eventInfo.event.extendedProps?.task;
    const categoryName = task?.SellProduct?.category?.name ?? task?.sellProduct?.category?.name;
    const Icon = getProductCategoryIcon(categoryName);
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="px-2 py-1 truncate text-xs font-medium cursor-pointer w-full flex items-center gap-1">
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{eventInfo.event.title}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <EventTooltipContent task={task || null} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, []);

  const handleEventClick = useCallback(
    (info: any) => {
      const taskId = info.event.extendedProps?.taskId;
      if (taskId && effectiveDomain) {
        router.push(`/sites/${effectiveDomain}/progetti/${taskId}`);
      }
    },
    [effectiveDomain, router]
  );

  const handleDatesSet = useCallback((dateInfo: any) => {
    if (dateInfo?.view?.title) {
      setCurrentTitle(fixCalendarTitle(dateInfo.view.title));
    }
    const start = dateInfo?.view?.currentStart;
    if (start) {
      const s = new Date(start);
      const monthStart = new Date(s.getFullYear(), s.getMonth(), 1);
      const monthEnd = new Date(s.getFullYear(), s.getMonth() + 1, 0);
      const midMonth = new Date(s.getFullYear(), s.getMonth(), 15);
      const dayOfWeek = midMonth.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(midMonth);
      weekStart.setDate(midMonth.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4);
      weekEnd.setHours(23, 59, 59, 999);
      setDateRange({ weekStart, weekEnd, monthStart, monthEnd });
    }
  }, []);

  useEffect(() => {
    if (!mounted || !calendarRef.current || !components) return;
    const api = calendarRef.current.getApi?.();
    if (api?.view?.title) {
      setCurrentTitle(fixCalendarTitle(api.view.title));
    }
  }, [mounted, components]);

  if (!mounted || !components) {
    return (
      <div className="py-4 z-20 relative w-full">
        <div className="animate-pulse rounded-md h-96 bg-gray-200 dark:bg-white/10" />
      </div>
    );
  }

  const { FullCalendar: FC, resourceTimelinePlugin } = components;

  return (
    <div className="py-4 z-20 relative w-full">
      <style jsx global>{`
        .fc-timeline .fc-resource-timeline .fc-scrollgrid { font-family: inherit; }
        .fc-timeline-slot-frame { min-height: 2em; }
        .fc .fc-toolbar-title { display: none !important; }
        .fc .fc-button { background: hsl(var(--background)); border-color: hsl(var(--input)); color: hsl(var(--foreground)); }
        .fc .fc-button:hover { background: hsl(var(--accent)); }
        .fc-timeline .fc-timeline-body { background: hsl(var(--card)); }
        .fc-resource-group-cell { background: hsl(var(--muted)); }
        .fc-datagrid-cell-frame { background: hsl(var(--card)); }
      `}</style>
      <div className="calendar-custom-title mb-4 text-center">
        <h1 className="text-2xl font-bold mb-1">{CALENDAR_TYPE_NAMES[calendarType]}</h1>
        <p className="text-lg text-muted-foreground">{currentTitle}</p>
      </div>
      <CalendarSummaryBar
        tasks={filteredTasks}
        weekStart={dateRange.weekStart}
        weekEnd={dateRange.weekEnd}
        monthStart={dateRange.monthStart}
        monthEnd={dateRange.monthEnd}
      />
      <FC
        ref={calendarRef}
        key="calendar-time"
        plugins={[resourceTimelinePlugin]}
        initialView="resourceTimelineWeek"
        resources={RESOURCES}
        events={events}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        slotMinTime="06:00"
        slotMaxTime="20:00"
        slotDuration="01:00"
        slotLabelInterval="02:00"
        weekends={false}
        locale={components.itLocale || undefined}
        headerToolbar={{ left: "prev,next today", center: "", right: "" }}
        datesSet={handleDatesSet}
        height="auto"
      />
    </div>
  );
}
