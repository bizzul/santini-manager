"use client";

import React, { useMemo, useState } from "react";
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
  RefreshCw,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const SLOT_HEIGHT = 34;
const TIME_COLUMN_WIDTH = 60;
const DAY_COLUMN_MIN_WIDTH = 168;

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
  slotStartHour: number;
  slotEndHour: number;
  slotMinutes: number;
  onItemClick: (item: WeeklyCalendarItem) => void;
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
  visibleWeekDays = 5,
  timetrackingEditConfig,
}: WeeklyCalendarViewProps) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [filters, setFilters] = useState<WeeklyCalendarFilters>(
    createDefaultFilters(mode === "personal")
  );
  const [selectedItem, setSelectedItem] = useState<WeeklyCalendarItem | null>(null);
  const [isSummaryPanelOpen, setIsSummaryPanelOpen] = useState(true);

  const weekItems = useMemo(
    () => filterItemsForWeek(items, weekStart),
    [items, weekStart]
  );

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
              {formatWeekRangeLabel(weekStart)}
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

          <div className="flex flex-wrap items-center gap-2">
            {collapsibleSummaryPanel && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setIsSummaryPanelOpen((current) => !current)}
              >
                {isSummaryPanelOpen ? (
                  <ChevronRight className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronLeft className="mr-2 h-4 w-4" />
                )}
                {isSummaryPanelOpen ? "Nascondi riepilogo" : "Mostra riepilogo"}
              </Button>
            )}
            {showFiltersBar && (
              <Button
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setFilters(createDefaultFilters(mode === "personal"))}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset filtri
              </Button>
            )}
          </div>
        </div>
      </div>

      {showFiltersBar && (
        <CalendarFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          options={filterOptions}
          currentUserId={currentUserId}
        />
      )}

      {legendItems.length > 0 && <CalendarLegend items={legendItems} />}

      <div
        className={cn(
          "grid gap-4",
          isSummaryPanelOpen &&
            (compactSummaryPanel
              ? "2xl:grid-cols-[minmax(0,1fr)_250px]"
              : "2xl:grid-cols-[minmax(0,1fr)_320px]")
        )}
      >
        <CalendarTimeGrid
          items={filteredItems}
          weekStart={weekStart}
          visibleWeekDays={visibleWeekDays}
          slotStartHour={slotStartHour}
          slotEndHour={slotEndHour}
          slotMinutes={slotMinutes}
          onItemClick={setSelectedItem}
        />
        {isSummaryPanelOpen && (
          <HoursSummaryPanel
            summary={summary}
            mode={mode}
            compact={compactSummaryPanel}
          />
        )}
      </div>

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
  visibleWeekDays = 5,
  slotStartHour,
  slotEndHour,
  slotMinutes,
  onItemClick,
}: CalendarTimeGridProps) {
  const weekDays = useMemo(
    () => getWeekDays(weekStart).slice(0, visibleWeekDays),
    [visibleWeekDays, weekStart]
  );
  const positionedItems = useMemo(
    () =>
      buildPositionedCalendarItems(
        items,
        weekStart,
        slotStartHour,
        slotEndHour,
        slotMinutes,
        SLOT_HEIGHT
      ),
    [items, weekStart, slotStartHour, slotEndHour, slotMinutes]
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

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="hidden lg:block">
          <div className="max-h-[78vh] overflow-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${weekDays.length}, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`,
              }}
            >
              <div className="sticky top-0 z-20 border-b bg-card" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "sticky top-0 z-20 border-b border-l bg-card px-2.5 py-3",
                    isTodayInWeek(day) && "bg-primary/5"
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEEE", { locale: it })}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold capitalize xl:text-lg">
                      {formatDayLabel(day)}
                    </p>
                    {isTodayInWeek(day) && <Badge>Oggi</Badge>}
                  </div>
                </div>
              ))}

              <div className="relative border-r bg-muted/20">
                {slots.slice(0, -1).map((slot, index) => (
                  <div
                    key={slot.toISOString()}
                    className="absolute inset-x-0 border-t px-2 pt-1 text-[11px] text-muted-foreground"
                    style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  >
                    {formatTimeLabel(slot)}
                  </div>
                ))}
              </div>

              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayItems = positionedItems.filter((item) => item.dayKey === dayKey);

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      "relative border-l",
                      isTodayInWeek(day) && "bg-primary/5"
                    )}
                    style={{ height: gridHeight }}
                  >
                    {slots.slice(0, -1).map((slot, index) => (
                      <div
                        key={`${dayKey}-${slot.toISOString()}`}
                        className={cn(
                          "absolute inset-x-0 border-t",
                          index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                        )}
                        style={{ top: index * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                      />
                    ))}

                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className="absolute px-1"
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
                            onClick={() => onItemClick(item)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 lg:hidden">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayItems = positionedItems.filter((item) => item.dayKey === dayKey);

            return (
              <div key={dayKey} className="rounded-xl border">
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
                        onClick={() => onItemClick(item)}
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
