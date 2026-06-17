"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { addDays, format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import {
  BellRing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  formatWeekRangeLabel,
  getWeekDays,
  getWeekStart,
  parseDateValue,
} from "../calendar-utils";
import { CalendarProjectCard } from "../CalendarProjectCard";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";
import { ConflictBadge } from "./ConflictBadge";
import { DayColumn, type DenseMode } from "./DayColumn";
import { EventCard } from "./EventCard";
import { UnscheduledTimeContainer } from "./UnscheduledTimeContainer";
import { useCalendarDnd } from "./useCalendarDnd";
import { useOverlapLayout, type DayLayout } from "./useOverlapLayout";
import {
  GRID_HEIGHT,
  TIME_COL_WIDTH,
  WEEK_SLOT_CONFIG,
  buildHourLabels,
} from "./calendar-grid-config";

const HOVER_EXPAND_DELAY = 350;

interface WeekCalendarProps {
  items: WeeklyCalendarItem[];
  /** Sola lettura: niente drag/drop (es. calendario personale collaboratore). */
  readOnly?: boolean;
  onItemClick?: (item: WeeklyCalendarItem) => void;
  onReschedule?: (item: WeeklyCalendarItem, start: Date, end: Date) => void;
  onAssignDay?: (item: WeeklyCalendarItem, day: Date) => void;
  onConflictCountChange?: (count: number) => void;
  initialWeekStart?: Date;
}

export function WeekCalendar({
  items,
  readOnly = false,
  onItemClick,
  onReschedule,
  onAssignDay,
  onConflictCountChange,
  initialWeekStart,
}: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(
    () => initialWeekStart ?? getWeekStart(new Date())
  );
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [denseMode, setDenseMode] = useState<DenseMode>("side-by-side");
  const [pendingOpen, setPendingOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = WEEK_SLOT_CONFIG;
  const gridHeight = GRID_HEIGHT;

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const daysByKey = useMemo(() => {
    const map = new Map<string, Date>();
    weekDays.forEach((day) => map.set(format(day, "yyyy-MM-dd"), day));
    return map;
  }, [weekDays]);

  const layout = useOverlapLayout(items, weekDays, config);

  useEffect(() => {
    onConflictCountChange?.(layout.conflictItemIds.size);
  }, [layout.conflictItemIds, onConflictCountChange]);

  // Card "time-pending": in settimana -> contenitore del giorno; fuori -> pannello.
  const { pendingByDay, pendingOutOfWeek } = useMemo(() => {
    const byDay = new Map<string, WeeklyCalendarItem[]>();
    const outOfWeek: WeeklyCalendarItem[] = [];

    items.forEach((item) => {
      if ((item.scheduleDisplay ?? "timed") !== "time-pending") return;
      const date = parseDateValue(item.startDatetime);
      const dayKey = date ? format(date, "yyyy-MM-dd") : null;
      if (dayKey && daysByKey.has(dayKey)) {
        const list = byDay.get(dayKey) ?? [];
        list.push(item);
        byDay.set(dayKey, list);
      } else {
        outOfWeek.push(item);
      }
    });

    return { pendingByDay: byDay, pendingOutOfWeek: outOfWeek };
  }, [items, daysByKey]);

  const { sensors, activeItem, onDragStart, onDragEnd } = useCalendarDnd({
    config,
    daysByKey,
    onReschedule: onReschedule ?? (() => {}),
    onAssignDay: onAssignDay ?? (() => {}),
    disabled: readOnly,
  });

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHoverTimer(), [clearHoverTimer]);

  // ESC ripristina larghezze uniformi.
  useEffect(() => {
    if (!expandedDayKey) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedDayKey(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expandedDayKey]);

  // Reset espansione cambiando settimana.
  useEffect(() => {
    setExpandedDayKey(null);
  }, [weekStart]);

  const gridTemplateColumns = useMemo(() => {
    if (!expandedDayKey) {
      return `${TIME_COL_WIDTH}px repeat(7, minmax(0, 1fr))`;
    }
    const tracks = weekDays
      .map((day) =>
        format(day, "yyyy-MM-dd") === expandedDayKey ? "2.5fr" : "0.4fr"
      )
      .join(" ");
    return `${TIME_COL_WIDTH}px ${tracks}`;
  }, [expandedDayKey, weekDays]);

  const handleHeaderClick = useCallback((dayKey: string) => {
    setExpandedDayKey((current) => (current === dayKey ? null : dayKey));
  }, []);

  const handleHeaderHover = useCallback(
    (dayKey: string, hasConflicts: boolean) => {
      clearHoverTimer();
      if (!hasConflicts || expandedDayKey === dayKey) return;
      hoverTimerRef.current = setTimeout(() => {
        setExpandedDayKey(dayKey);
      }, HOVER_EXPAND_DELAY);
    },
    [clearHoverTimer, expandedDayKey]
  );

  const hourLabels = useMemo(() => buildHourLabels(), []);

  const emptyDayLayout = useCallback(
    (dayKey: string, day: Date): DayLayout => ({
      dayKey,
      day,
      events: [],
      maxLanes: 1,
      conflictCount: 0,
    }),
    []
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        {/* Pannello "Da definire" (sorgente drag) per card senza giorno in settimana */}
        {pendingOutOfWeek.length > 0 && (
          <Collapsible
            open={pendingOpen}
            onOpenChange={setPendingOpen}
            className="shrink-0 rounded-lg border border-border/60 bg-muted/20"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <BellRing className="h-4 w-4 shrink-0 text-warning" />
                  <span className="text-sm font-semibold">Da definire</span>
                  <Badge variant="secondary" className="shrink-0">
                    {pendingOutOfWeek.length}
                  </Badge>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    trascina su un giorno per pianificare
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    pendingOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="max-h-52 overflow-y-auto border-t border-border/60 p-3 sm:max-h-60">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pendingOutOfWeek.map((item) => (
                    <div key={item.id} className="min-h-[116px]">
                      <EventCard
                        item={item}
                        variant="split"
                        draggable={!readOnly}
                        onClick={
                          onItemClick ? () => onItemClick(item) : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Barra navigazione settimana + toggle densità */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
              aria-label="Settimana precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
              aria-label="Settimana successiva"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setWeekStart(getWeekStart(new Date()))}
            >
              Oggi
            </Button>
            <span className="ml-2 text-sm font-semibold capitalize">
              {formatWeekRangeLabel(weekStart)}
            </span>
          </div>

          <div className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-1">
            <Button
              type="button"
              variant={denseMode === "side-by-side" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setDenseMode("side-by-side")}
            >
              <Columns2 className="h-3.5 w-3.5" />
              Affianca
            </Button>
            <Button
              type="button"
              variant={denseMode === "stacked" ? "default" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setDenseMode("stacked")}
            >
              <Layers className="h-3.5 w-3.5" />
              Impila
            </Button>
          </div>
        </div>

        {/* Griglia settimanale */}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-card">
          <div
            className="grid min-w-[760px] motion-safe:transition-[grid-template-columns] motion-safe:duration-300 motion-safe:ease-in-out"
            style={{ gridTemplateColumns }}
          >
            {/* Riga header giorni */}
            <div className="sticky top-0 z-20 border-b border-border/60 bg-card" />
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayLayout = layout.byDayKey.get(dayKey);
              const isMini =
                Boolean(expandedDayKey) && expandedDayKey !== dayKey;
              const isToday = isSameDay(day, new Date());
              const conflictCount = dayLayout?.conflictCount ?? 0;
              return (
                <button
                  type="button"
                  key={`head-${dayKey}`}
                  onClick={() => handleHeaderClick(dayKey)}
                  onMouseEnter={() =>
                    handleHeaderHover(dayKey, conflictCount > 0)
                  }
                  onMouseLeave={clearHoverTimer}
                  title="Clicca per espandere/comprimere la giornata"
                  className={cn(
                    "sticky top-0 z-20 flex flex-col items-center gap-0.5 border-b border-l border-border/60 bg-card px-1 py-1.5 text-center transition-colors hover:bg-accent/40",
                    isToday && "bg-primary/5",
                    expandedDayKey === dayKey && "bg-primary/10"
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {format(day, isMini ? "EEEEE" : "EEE", { locale: it })}
                  </span>
                  {!isMini ? (
                    <span className="text-sm font-semibold capitalize">
                      {format(day, "d MMM", { locale: it })}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold">
                      {format(day, "d")}
                    </span>
                  )}
                  {conflictCount > 0 && <ConflictBadge count={conflictCount} />}
                </button>
              );
            })}

            {/* Riga "Orario da assegnare" */}
            <div className="flex items-start justify-end border-b border-border/60 bg-card px-1 py-1 text-right text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              Da
            </div>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const isMini =
                Boolean(expandedDayKey) && expandedDayKey !== dayKey;
              return (
                <UnscheduledTimeContainer
                  key={`unsched-${dayKey}`}
                  dayKey={dayKey}
                  items={pendingByDay.get(dayKey) ?? []}
                  isMini={isMini}
                  draggable={!readOnly}
                  onItemClick={onItemClick}
                />
              );
            })}

            {/* Riga griglia oraria */}
            <div
              className="relative border-r border-border/60 bg-muted/10"
              style={{ height: gridHeight }}
            >
              {hourLabels.map((label) => (
                <div
                  key={label.hour}
                  className="absolute inset-x-0 px-1 text-[10px] text-muted-foreground"
                  style={{ top: label.top }}
                >
                  {String(label.hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayLayout =
                layout.byDayKey.get(dayKey) ?? emptyDayLayout(dayKey, day);
              const isMini =
                Boolean(expandedDayKey) && expandedDayKey !== dayKey;
              const isToday = isSameDay(day, new Date());
              return (
                <DayColumn
                  key={`grid-${dayKey}`}
                  dayKey={dayKey}
                  layout={dayLayout}
                  config={config}
                  gridHeight={gridHeight}
                  isMini={isMini}
                  isToday={isToday}
                  denseMode={denseMode}
                  draggable={!readOnly}
                  onItemClick={onItemClick}
                  onMiniClick={() => setExpandedDayKey(dayKey)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-[220px] rotate-1 opacity-90 shadow-lg">
            <CalendarProjectCard item={activeItem} compact readOnly />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
