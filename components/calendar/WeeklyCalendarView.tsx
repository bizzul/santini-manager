"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  LayoutGrid,
  ListFilter,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CalendarProjectCard } from "./CalendarProjectCard";
import { ProjectOrSiteDetailDrawer } from "./ProjectOrSiteDetailDrawer";
import {
  DEFAULT_SLOT_END_HOUR,
  DEFAULT_SLOT_MINUTES,
  DEFAULT_SLOT_START_HOUR,
  applyCalendarFilters,
  buildPositionedCalendarItems,
  calculateCalendarSummary,
  createDefaultFilters,
  filterItemsForWeek,
  formatDayLabel,
  formatMinutesAsHours,
  formatTimeLabel,
  formatWeekRangeLabel,
  getStatusLegend,
  getWeekDays,
  getWeekStart,
  isTodayInWeek,
} from "./calendar-utils";
import type {
  CalendarFilterOption,
  CalendarSummaryData,
  WeeklyCalendarFilters,
  WeeklyCalendarItem,
  WeeklyCalendarTimetrackingEditConfig,
  WeeklyCalendarTimetrackingEntry,
  WeeklyCalendarTargetConfig,
} from "./weekly-calendar-types";

const SLOT_HEIGHT = 42;
const TIME_COLUMN_WIDTH = 56;
const DAY_COLUMN_MIN_WIDTH = 110;
const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 13;

interface WeeklyCalendarViewProps {
  items: WeeklyCalendarItem[];
  title: string;
  description?: string;
  mode?: "personal" | "admin";
  currentUserId?: string;
  targetConfig?: WeeklyCalendarTargetConfig;
  slotStartHour?: number;
  slotEndHour?: number;
  slotMinutes?: number;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  showFiltersBar?: boolean;
  compactSummaryPanel?: boolean;
  collapsibleSummaryPanel?: boolean;
  visibleWeekDays?: number;
  /** Numero di settimane affiancate (es. 2 = corrente + successiva). */
  weeksToShow?: number;
  timetrackingEditConfig?: WeeklyCalendarTimetrackingEditConfig;
}

interface CalendarFiltersBarProps {
  filters: WeeklyCalendarFilters;
  onFiltersChange: (next: WeeklyCalendarFilters) => void;
  options: {
    collaborators: CalendarFilterOption[];
    projects: CalendarFilterOption[];
    sites: CalendarFilterOption[];
    statuses: CalendarFilterOption[];
    activityTypes: CalendarFilterOption[];
  };
  currentUserId?: string;
}

interface CalendarTimeGridProps {
  items: WeeklyCalendarItem[];
  weekStart: Date;
  visibleWeekDays?: number;
  /** Quante settimane affiancate disegnare (almeno 1). */
  weeksToShow?: number;
  slotStartHour: number;
  slotEndHour: number;
  slotMinutes: number;
  onItemClick: (item: WeeklyCalendarItem) => void;
  onDayClick?: (day: Date) => void;
}

interface HoursSummaryPanelProps {
  summary: CalendarSummaryData;
  mode: "personal" | "admin";
  compact?: boolean;
}

export function WeeklyCalendarView({
  items,
  title,
  description,
  mode = "personal",
  currentUserId,
  targetConfig,
  slotStartHour = DEFAULT_SLOT_START_HOUR,
  slotEndHour = DEFAULT_SLOT_END_HOUR,
  slotMinutes = DEFAULT_SLOT_MINUTES,
  emptyStateTitle = "Nessuna attivita pianificata",
  emptyStateDescription = "Prova a cambiare settimana o a regolare i filtri.",
  showFiltersBar = true,
  compactSummaryPanel = false,
  collapsibleSummaryPanel = false,
  visibleWeekDays = 7,
  weeksToShow = 1,
  timetrackingEditConfig,
}: WeeklyCalendarViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [filters, setFilters] = useState<WeeklyCalendarFilters>(
    createDefaultFilters(mode === "personal")
  );
  const [selectedItem, setSelectedItem] = useState<WeeklyCalendarItem | null>(null);
  const [isSummaryPanelOpen, setIsSummaryPanelOpen] = useState(true);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  const visibleSpanDays = useMemo(
    () => Math.max(1, weeksToShow) * Math.max(1, visibleWeekDays),
    [visibleWeekDays, weeksToShow]
  );

  const weekItems = useMemo(() => {
    const aggregated: WeeklyCalendarItem[] = [];
    const seen = new Set<string>();
    for (let weekIndex = 0; weekIndex < Math.max(1, weeksToShow); weekIndex += 1) {
      const start = addDaysSafe(weekStart, weekIndex * 7);
      filterItemsForWeek(items, start).forEach((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          aggregated.push(item);
        }
      });
    }
    return aggregated;
  }, [items, weekStart, weeksToShow]);

  const filterOptions = useMemo(() => {
    const collaborators = new Map<string, string>();
    const projects = new Map<string, string>();
    const sites = new Map<string, string>();
    const statuses = new Set<string>();
    const activityTypes = new Set<string>();

    weekItems.forEach((item) => {
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
  }, [weekItems]);

  const filteredItems = useMemo(
    () => applyCalendarFilters(weekItems, filters, currentUserId),
    [weekItems, filters, currentUserId]
  );

  const summary = useMemo(
    () => calculateCalendarSummary(filteredItems, weekStart, targetConfig),
    [filteredItems, weekStart, targetConfig]
  );

  const legendItems = useMemo(() => getStatusLegend(filteredItems), [filteredItems]);
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
              onClick={() => setWeekStart((current) => addDaysSafe(current, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setWeekStart(getWeekStart(new Date()))}
            >
              <TimerReset className="mr-2 h-4 w-4" />
              Questa settimana
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart((current) => addDaysSafe(current, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Clock3 className="mr-1.5 h-3.5 w-3.5" />
              {weeksToShow > 1
                ? `${formatWeekRangeLabel(weekStart)} -> ${formatWeekRangeLabel(addDaysSafe(weekStart, (weeksToShow - 1) * 7))}`
                : formatWeekRangeLabel(weekStart)}
            </Badge>
            <Badge variant="outline">
              {filteredItems.length} card{filteredItems.length === 1 ? "a" : ""}
            </Badge>
            {summary.conflictCount > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                {summary.conflictCount} conflitt
                {summary.conflictCount === 1 ? "o" : "i"}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2" />
        </div>
      </div>

      {legendItems.length > 0 && <CalendarLegend items={legendItems} />}

      <div className="grid gap-4">
        <CalendarTimeGrid
          items={filteredItems}
          weekStart={weekStart}
          visibleWeekDays={visibleWeekDays}
          weeksToShow={Math.max(1, weeksToShow)}
          slotStartHour={slotStartHour}
          slotEndHour={slotEndHour}
          slotMinutes={slotMinutes}
          onItemClick={setSelectedItem}
          onDayClick={(day) => setExpandedDay(day)}
        />
      </div>

      <DayDetailDialog
        day={expandedDay}
        items={filteredItems}
        slotStartHour={slotStartHour}
        slotEndHour={slotEndHour}
        slotMinutes={slotMinutes}
        onClose={() => setExpandedDay(null)}
        onItemClick={setSelectedItem}
      />

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <LayoutGrid className="h-10 w-10 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="font-semibold">{emptyStateTitle}</p>
              <p className="text-sm text-muted-foreground">
                {emptyStateDescription}
              </p>
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

export function CalendarFiltersBar({
  filters,
  onFiltersChange,
  options,
  currentUserId,
}: CalendarFiltersBarProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filtri calendario
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CalendarSelect
            label="Collaboratore"
            value={filters.collaborator}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, collaborator: value })
            }
            options={options.collaborators}
          />
          <CalendarSelect
            label="Progetto"
            value={filters.project}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, project: value })
            }
            options={options.projects}
          />
          <CalendarSelect
            label="Cantiere"
            value={filters.site}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, site: value })
            }
            options={options.sites}
          />
          <CalendarSelect
            label="Stato"
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value })
            }
            options={options.statuses}
          />
          <CalendarSelect
            label="Tipologia attivita"
            value={filters.activityType}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, activityType: value })
            }
            options={options.activityTypes}
          />
          <CalendarSelect
            label="Pianificato / consuntivo"
            value={filters.mode}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                mode: value as WeeklyCalendarFilters["mode"],
              })
            }
            options={[
              { value: "both", label: "Entrambi" },
              { value: "planned", label: "Pianificato" },
              { value: "actual", label: "Consuntivo" },
            ]}
          />
          <div className="flex items-end">
            <label className="flex min-h-10 w-full items-center gap-3 rounded-lg border px-3">
              <Checkbox
                checked={filters.onlyMine}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, onlyMine: Boolean(checked) })
                }
                disabled={!currentUserId}
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Solo mie attivita</p>
                <p className="text-xs text-muted-foreground">
                  Filtra sugli elementi assegnati a me
                </p>
              </div>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: CalendarFilterOption[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CalendarLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ListFilter className="h-4 w-4" />
        <span>Legenda</span>
      </div>
      {items.map((item) => (
        <Badge key={item.label} variant="outline" className="gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

export function CalendarTimeGrid({
  items,
  weekStart,
  visibleWeekDays = 7,
  weeksToShow = 1,
  slotStartHour,
  slotEndHour,
  slotMinutes,
  onItemClick,
  onDayClick,
}: CalendarTimeGridProps) {
  const router = useRouter();
  const safeWeeks = Math.max(1, weeksToShow);
  const safeDaysPerWeek = Math.max(1, visibleWeekDays);

  const weeks = useMemo(() => {
    return Array.from({ length: safeWeeks }, (_, index) => ({
      weekIndex: index,
      start: addDaysSafe(weekStart, index * 7),
      days: getWeekDays(addDaysSafe(weekStart, index * 7)).slice(0, safeDaysPerWeek),
    }));
  }, [safeDaysPerWeek, safeWeeks, weekStart]);

  const positionedByWeek = useMemo(
    () =>
      weeks.map((week) =>
        buildPositionedCalendarItems(
          items,
          week.start,
          slotStartHour,
          slotEndHour,
          slotMinutes,
          SLOT_HEIGHT
        )
      ),
    [items, slotEndHour, slotMinutes, slotStartHour, weeks]
  );

  const slots = useMemo(() => {
    const totalMinutes = (slotEndHour - slotStartHour) * 60;
    const steps = totalMinutes / slotMinutes;
    return Array.from({ length: steps + 1 }, (_, index) => {
      const hours = slotStartHour + Math.floor((index * slotMinutes) / 60);
      const minutes = (index * slotMinutes) % 60;
      const date = new Date(weekStart);
      date.setHours(hours, minutes, 0, 0);
      return date;
    });
  }, [slotEndHour, slotMinutes, slotStartHour, weekStart]);

  const gridHeight = ((slotEndHour - slotStartHour) * 60 * SLOT_HEIGHT) / slotMinutes;

  const handleItemClick = (item: WeeklyCalendarItem) => {
    if (item.detailHref) {
      router.push(item.detailHref);
      return;
    }
    onItemClick(item);
  };

  const totalDayColumns = safeWeeks * safeDaysPerWeek;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="hidden lg:block">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${totalDayColumns}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
            }}
          >
            <div className="border-b bg-card" />
            {weeks.flatMap((week) =>
              week.days.map((day, dayIndexInWeek) => {
                const isFutureWeek = week.weekIndex > 0;
                return (
                  <button
                    type="button"
                    key={`${week.weekIndex}-${day.toISOString()}`}
                    onClick={() => onDayClick?.(day)}
                    className={cn(
                      "border-b border-l px-2 py-2 text-center transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      week.weekIndex === 0 ? "bg-card" : "bg-muted/10",
                      isTodayInWeek(day) && "bg-primary/5",
                      dayIndexInWeek === 0 && week.weekIndex > 0 && "border-l-2 border-l-border",
                      isFutureWeek && "opacity-70"
                    )}
                    title="Apri giornata in modalita estesa"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {format(day, "EEEEEE", { locale: it })}
                    </p>
                    <p className="text-sm font-semibold capitalize">
                      {format(day, "d MMM", { locale: it })}
                    </p>
                  </button>
                );
              })
            )}

            <div className="relative border-r bg-muted/20">
              {slots.slice(0, -1).map((slot, index) => {
                const slotHour = slot.getHours();
                const isLunch = slotHour >= LUNCH_START_HOUR && slotHour < LUNCH_END_HOUR;
                return (
                  <div
                    key={slot.toISOString()}
                    className={cn(
                      "absolute inset-x-0 border-t px-2 pt-0.5 text-[10px] text-muted-foreground",
                      isLunch && "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    )}
                    style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  >
                    {formatTimeLabel(slot)}
                  </div>
                );
              })}
            </div>

            {weeks.flatMap((week, weekIdx) => {
              const positionedItems = positionedByWeek[weekIdx] || [];
              const isFutureWeek = week.weekIndex > 0;
              return week.days.map((day, dayIndexInWeek) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayItems = positionedItems.filter((item) => item.dayKey === dayKey);

                return (
                  <div
                    key={`day-${week.weekIndex}-${dayKey}`}
                    className={cn(
                      "relative border-l",
                      isTodayInWeek(day) && "bg-primary/5",
                      dayIndexInWeek === 0 && week.weekIndex > 0 && "border-l-2 border-l-border",
                      isFutureWeek && "bg-muted/5 opacity-75"
                    )}
                    style={{ height: gridHeight }}
                  >
                    {slots.slice(0, -1).map((slot, index) => {
                      const slotHour = slot.getHours();
                      const isLunch = slotHour >= LUNCH_START_HOUR && slotHour < LUNCH_END_HOUR;
                      return (
                        <div
                          key={`${dayKey}-${slot.toISOString()}-${week.weekIndex}`}
                          className={cn(
                            "absolute inset-x-0 border-t",
                            isLunch
                              ? "bg-amber-500/10 dark:bg-amber-500/15"
                              : index % 2 === 0
                                ? "bg-transparent"
                                : "bg-muted/10"
                          )}
                          style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                        />
                      );
                    })}

                    {dayItems.map((item) => (
                      <div
                        key={`${item.id}-${week.weekIndex}`}
                        className="absolute px-0.5"
                        style={{
                          top: item.top,
                          left: `${(item.column / item.columnCount) * 100}%`,
                          width: `${100 / item.columnCount}%`,
                          height: item.height,
                        }}
                      >
                        <div
                          className={cn(
                            "h-full",
                            item.isConflict && "rounded-xl ring-2 ring-red-400/70"
                          )}
                        >
                          <CalendarProjectCard
                            item={{
                              ...item,
                              startDatetime: item.start.toISOString(),
                              endDatetime: item.end.toISOString(),
                            }}
                            compact
                            onClick={() => handleItemClick(item)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              });
            })}
          </div>
        </div>

        <div className="space-y-4 p-4 lg:hidden">
          {weeks.flatMap((week, weekIdx) => {
            const positionedItems = positionedByWeek[weekIdx] || [];
            const isFutureWeek = week.weekIndex > 0;
            return week.days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayItems = positionedItems.filter((item) => item.dayKey === dayKey);

              return (
                <div
                  key={`mobile-${week.weekIndex}-${dayKey}`}
                  className={cn(
                    "rounded-xl border",
                    isFutureWeek && "opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between border-b px-4 py-3",
                      isTodayInWeek(day) && "bg-primary/5"
                    )}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {format(day, "EEEE", { locale: it })}
                      </p>
                      <p className="font-semibold capitalize">{formatDayLabel(day)}</p>
                    </div>
                    {isTodayInWeek(day) && <Badge>Oggi</Badge>}
                  </div>
                  <div className="space-y-3 p-3">
                    {dayItems.length > 0 ? (
                      dayItems.map((item) => (
                        <CalendarProjectCard
                          key={item.id}
                          item={{
                            ...item,
                            startDatetime: item.start.toISOString(),
                            endDatetime: item.end.toISOString(),
                          }}
                          onClick={() => handleItemClick(item)}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                        Nessuna attivita prevista
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function HoursSummaryPanel({
  summary,
  mode,
  compact = false,
}: HoursSummaryPanelProps) {
  const primaryBuckets =
    mode === "admin" ? summary.byCollaborator : summary.byProject;
  const dayItems = compact ? summary.byDay.slice(0, 5) : summary.byDay.slice(0, 7);
  const primaryItems = primaryBuckets.slice(0, compact ? 4 : 6);
  const projectItems = summary.byProject.slice(0, compact ? 4 : 6);
  const incompleteItems = summary.incompleteDays.slice(0, compact ? 3 : 5);

  return (
    <Card className="h-fit">
      <CardHeader className={cn("space-y-3", compact && "space-y-2 pb-4")}>
        <CardTitle className={cn("text-base", compact && "text-sm")}>
          Riepilogo ore
        </CardTitle>
        <div className={cn("grid grid-cols-2 gap-3", compact && "gap-2")}>
          <SummaryStat
            label="Pianificate"
            value={formatMinutesAsHours(summary.totalPlannedMinutes)}
            compact={compact}
          />
          <SummaryStat
            label="Effettive"
            value={formatMinutesAsHours(summary.totalActualMinutes)}
            compact={compact}
          />
          <SummaryStat
            label="Delta"
            value={formatSignedMinutes(summary.differenceMinutes)}
            compact={compact}
          />
          <SummaryStat
            label="Conflitti"
            value={String(summary.conflictCount)}
            destructive={summary.conflictCount > 0}
            compact={compact}
          />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-5", compact && "space-y-4 pt-0")}>
        <SummaryList
          title="Ore per giorno"
          items={dayItems}
          showDelta={true}
          compact={compact}
        />
        <SummaryList
          title={mode === "admin" ? "Ore per collaboratore" : "Ore per progetto"}
          items={primaryItems}
          showDelta={mode === "admin"}
          compact={compact}
        />
        {mode === "admin" && summary.byProject.length > 0 && (
          <SummaryList
            title="Ore per progetto / cantiere"
            items={projectItems}
            showDelta={true}
            compact={compact}
          />
        )}
        {summary.incompleteDays.length > 0 && (
          <div className={cn("space-y-3", compact && "space-y-2")}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className={cn("text-sm font-semibold", compact && "text-xs")}>
                Slot mancanti o incompleti
              </h3>
            </div>
            <div className="space-y-2">
              {incompleteItems.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                    compact && "px-2.5 py-2 text-xs"
                  )}
                >
                  <span className="capitalize">{day.label}</span>
                  <Badge variant="secondary">
                    -{formatMinutesAsHours(day.deficitMinutes)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
  destructive = false,
  compact = false,
}: {
  label: string;
  value: string;
  destructive?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-muted/15 p-3",
        compact && "rounded-lg p-2.5",
        destructive && "border-red-300 bg-red-500/5"
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold", compact && "text-base")}>{value}</p>
    </div>
  );
}

function SummaryList({
  title,
  items,
  showDelta = false,
  compact = false,
}: {
  title: string;
  items: CalendarSummaryData["byDay"];
  showDelta?: boolean;
  compact?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <h3 className={cn("text-sm font-semibold", compact && "text-xs")}>{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn("rounded-lg border px-3 py-2.5", compact && "px-2.5 py-2")}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={cn("text-sm font-medium", compact && "text-xs")}>
                {item.label}
              </span>
              <div className="text-right text-xs">
                <div className="font-semibold">
                  {formatMinutesAsHours(
                    Math.max(item.actualMinutes, item.plannedMinutes)
                  )}
                </div>
                {showDelta && (
                  <div className="text-muted-foreground">
                    {formatSignedMinutes(item.actualMinutes - item.plannedMinutes)}
                  </div>
                )}
              </div>
            </div>
            <div
              className={cn(
                "mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground",
                compact && "mt-1.5 gap-1"
              )}
            >
              <span>Pianif.: {formatMinutesAsHours(item.plannedMinutes)}</span>
              <span>Cons.: {formatMinutesAsHours(item.actualMinutes)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toOptions(map: Map<string, string>): CalendarFilterOption[] {
  return Array.from(map.entries())
    .sort((left, right) => left[1].localeCompare(right[1], "it"))
    .map(([value, label]) => ({ value, label }));
}

interface DayDetailDialogProps {
  day: Date | null;
  items: WeeklyCalendarItem[];
  slotStartHour: number;
  slotEndHour: number;
  slotMinutes: number;
  onClose: () => void;
  onItemClick: (item: WeeklyCalendarItem) => void;
}

const DAY_DETAIL_HOUR_HEIGHT = 64;
const DAY_DETAIL_UNTIMED_SLOTS: Array<{ startHour: number; endHour: number }> = [
  { startHour: 6, endHour: 8 },
  { startHour: 8, endHour: 10 },
  { startHour: 10, endHour: 12 },
  { startHour: 13, endHour: 15 },
  { startHour: 15, endHour: 17 },
  { startHour: 17, endHour: 19 },
];

function DayDetailDialog({
  day,
  items,
  slotStartHour,
  slotEndHour,
  slotMinutes,
  onClose,
  onItemClick,
}: DayDetailDialogProps) {
  const router = useRouter();

  const isOpen = Boolean(day);
  const dayKey = day ? format(day, "yyyy-MM-dd") : null;

  const totalHours = Math.max(1, slotEndHour - slotStartHour);
  const stepsPerHour = Math.max(1, Math.round(60 / Math.max(1, slotMinutes)));
  const gridHeight = totalHours * DAY_DETAIL_HOUR_HEIGHT;

  const hourSlots = useMemo(() => {
    return Array.from({ length: totalHours }, (_, idx) => slotStartHour + idx);
  }, [slotStartHour, totalHours]);

  const dayItems = useMemo(() => {
    if (!dayKey) return [] as WeeklyCalendarItem[];
    return items.filter((item) => {
      const start = new Date(item.startDatetime);
      if (Number.isNaN(start.getTime())) return false;
      return format(start, "yyyy-MM-dd") === dayKey;
    });
  }, [items, dayKey]);

  const timedItems = useMemo(
    () => dayItems.filter((item) => (item.scheduleDisplay || "timed") === "timed"),
    [dayItems]
  );
  const untimedItems = useMemo(
    () => dayItems.filter((item) => (item.scheduleDisplay || "timed") !== "timed"),
    [dayItems]
  );

  const positionFromHour = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const offsetHours = hours + minutes / 60 - slotStartHour;
    return Math.max(0, offsetHours) * DAY_DETAIL_HOUR_HEIGHT;
  };

  const heightFromMinutes = (durationMinutes: number) => {
    return Math.max(
      DAY_DETAIL_HOUR_HEIGHT / stepsPerHour,
      (durationMinutes / 60) * DAY_DETAIL_HOUR_HEIGHT
    );
  };

  const handleItemClick = (item: WeeklyCalendarItem) => {
    if (item.detailHref) {
      router.push(item.detailHref);
      onClose();
      return;
    }
    onItemClick(item);
    onClose();
  };

  // Distribuzione progetti senza orario nelle 6 fasce 06-08, 08-10, 10-12, 13-15, 15-17, 17-19.
  const untimedAssignments: Array<{
    item: WeeklyCalendarItem;
    slotIndex: number;
  }> = useMemo(() => {
    return untimedItems.slice(0, DAY_DETAIL_UNTIMED_SLOTS.length).map((item, idx) => ({
      item,
      slotIndex: idx,
    }));
  }, [untimedItems]);

  const untimedOverflow = useMemo(
    () => untimedItems.slice(DAY_DETAIL_UNTIMED_SLOTS.length),
    [untimedItems]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[760px] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {day
              ? `${format(day, "EEEE d MMMM yyyy", { locale: it })}`
              : "Dettaglio giornata"}
          </DialogTitle>
          <DialogDescription>
            Modalita estesa: {dayItems.length} progetto
            {dayItems.length === 1 ? "" : "i"} programmat
            {dayItems.length === 1 ? "o" : "i"} per la giornata.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div
            className="grid"
            style={{ gridTemplateColumns: "60px minmax(0, 1fr)" }}
          >
            <div className="relative border-r" style={{ height: gridHeight }}>
              {hourSlots.map((hour, idx) => (
                <div
                  key={`hour-${hour}`}
                  className={cn(
                    "absolute inset-x-0 border-t px-2 pt-1 text-[11px] text-muted-foreground",
                    hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                      : ""
                  )}
                  style={{
                    top: idx * DAY_DETAIL_HOUR_HEIGHT,
                    height: DAY_DETAIL_HOUR_HEIGHT,
                  }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            <div className="relative" style={{ height: gridHeight }}>
              {hourSlots.map((hour, idx) => (
                <div
                  key={`row-${hour}`}
                  className={cn(
                    "absolute inset-x-0 border-t",
                    hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR
                      ? "bg-amber-500/10 dark:bg-amber-500/15"
                      : idx % 2 === 0
                        ? "bg-transparent"
                        : "bg-muted/10"
                  )}
                  style={{
                    top: idx * DAY_DETAIL_HOUR_HEIGHT,
                    height: DAY_DETAIL_HOUR_HEIGHT,
                  }}
                />
              ))}

              {timedItems.map((item) => {
                const start = new Date(item.startDatetime);
                const end = new Date(item.endDatetime);
                if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                  return null;
                }
                const top = positionFromHour(start);
                const durationMinutes =
                  (end.getTime() - start.getTime()) / 60000;
                const height = heightFromMinutes(Math.max(60, durationMinutes));
                return (
                  <div
                    key={`timed-${item.id}`}
                    className="absolute inset-x-2"
                    style={{ top, height: Math.min(height, gridHeight - top) }}
                  >
                    <CalendarProjectCard
                      item={item}
                      onClick={() => handleItemClick(item)}
                    />
                  </div>
                );
              })}

              {untimedAssignments.map(({ item, slotIndex }) => {
                const slot = DAY_DETAIL_UNTIMED_SLOTS[slotIndex];
                const startDate = new Date(0);
                startDate.setHours(slot.startHour, 0, 0, 0);
                const top =
                  (slot.startHour - slotStartHour) * DAY_DETAIL_HOUR_HEIGHT;
                const height =
                  (slot.endHour - slot.startHour) * DAY_DETAIL_HOUR_HEIGHT;
                return (
                  <div
                    key={`untimed-${item.id}`}
                    className="absolute inset-x-2"
                    style={{ top, height }}
                  >
                    <CalendarProjectCard
                      item={item}
                      onClick={() => handleItemClick(item)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {untimedOverflow.length > 0 && (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Altri progetti senza orario ({untimedOverflow.length})
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {untimedOverflow.map((item) => (
                  <CalendarProjectCard
                    key={`overflow-${item.id}`}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {dayItems.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              Nessun progetto programmato per questa giornata.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatSignedMinutes(value: number): string {
  if (value === 0) return "0h 00m";
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatMinutesAsHours(Math.abs(value))}`;
}

function addDaysSafe(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return getWeekStart(nextDate);
}
