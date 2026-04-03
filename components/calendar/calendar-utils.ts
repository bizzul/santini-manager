import {
  addDays,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  parseISO,
  setHours,
  setMinutes,
  startOfMonth,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";
import { getProjectClientName, getProjectObjectName } from "@/lib/project-label";
import type {
  CalendarAssignedUser,
  CalendarDataMode,
  CalendarScheduleDisplay,
  CalendarSummaryBucket,
  CalendarSummaryData,
  WeeklyCalendarFilters,
  WeeklyCalendarItem,
  WeeklyCalendarTargetConfig,
} from "./weekly-calendar-types";

export const DEFAULT_SLOT_MINUTES = 30;
export const DEFAULT_SLOT_START_HOUR = 6;
export const DEFAULT_SLOT_END_HOUR = 21;

const FALLBACK_TASK_START_HOUR = 8;
const FALLBACK_TASK_START_MINUTE = 0;
const FALLBACK_TASK_DURATION_MINUTES = 180;
const FALLBACK_TIMETRACKING_START_HOUR = 7;
const FALLBACK_ATTENDANCE_START_HOUR = 8;
const FALLBACK_ATTENDANCE_END_HOUR = 17;
const MINUTES_PER_HOUR = 60;

export type ProjectCalendarType = "production" | "installation" | "service" | "all";

type ProjectTaskSource = {
  id: number;
  unique_code?: string | null;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  luogo?: string | null;
  deliveryDate?: string | null;
  termine_produzione?: string | null;
  ora_inizio?: string | null;
  ora_fine?: string | null;
  squadra?: number | null;
  other?: string | null;
  percentStatus?: number | null;
  percent_status?: number | null;
  is_draft?: boolean | null;
  isDraft?: boolean | null;
  display_mode?: string | null;
  displayMode?: string | null;
  client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  Client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  Kanban?: {
    color?: string | null;
    title?: string | null;
  } | null;
  column?: {
    title?: string | null;
  } | null;
  SellProduct?: {
    name?: string | null;
    type?: string | null;
    category?: {
      name?: string | null;
      color?: string | null;
    } | null;
  } | null;
};

type TimetrackingSource = {
  id: number;
  task_id?: number | null;
  employee_id?: number | null;
  employeeId?: number | null;
  userId?: string | number | null;
  userName?: string | null;
  userPicture?: string | null;
  start_time?: string | null;
  startTime?: string | null;
  end_time?: string | null;
  endTime?: string | null;
  hours?: number | null;
  minutes?: number | null;
  description?: string | null;
  activity_type?: string | null;
  internal_activity?: string | null;
  created_at?: string | null;
  task?: {
    unique_code?: string | null;
    title?: string | null;
    name?: string | null;
    Client?: {
      businessName?: string | null;
      individualFirstName?: string | null;
      individualLastName?: string | null;
    } | null;
    client?: {
      businessName?: string | null;
      individualFirstName?: string | null;
      individualLastName?: string | null;
    } | null;
  } | null;
  user?: {
    id?: string | number | null;
    given_name?: string | null;
    family_name?: string | null;
    picture?: string | null;
    authId?: string | null;
  } | null;
  roles?: Array<{
    role?: {
      id?: number | null;
      name?: string | null;
    } | null;
    id?: number | null;
    name?: string | null;
  }>;
};

type AttendanceCalendarEntry = {
  userId: string;
  userName: string;
  userPicture?: string | null;
  status: string;
  date: string;
  notes?: string | null;
};

export interface PositionedCalendarItem extends WeeklyCalendarItem {
  dayKey: string;
  start: Date;
  end: Date;
  top: number;
  height: number;
  column: number;
  columnCount: number;
  isConflict: boolean;
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM", { locale: it })} - ${format(
    weekEnd,
    "d MMM yyyy",
    { locale: it }
  )}`;
}

export function formatDayLabel(day: Date): string {
  return format(day, "EEE d", { locale: it });
}

export function formatTimeLabel(date: Date): string {
  return format(date, "HH:mm");
}

export function formatMinutesAsHours(totalMinutes: number): string {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / MINUTES_PER_HOUR);
  const minutes = Math.round(safeMinutes % MINUTES_PER_HOUR);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

function buildInitials(name?: string | null): string {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function parseDateValue(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = value.trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = parseISO(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function withTime(
  dateValue: string | Date | null | undefined,
  timeValue: string | null | undefined,
  fallbackHour: number,
  fallbackMinute: number
): Date | null {
  const baseDate = parseDateValue(dateValue);
  if (!baseDate) return null;

  let nextDate = setMinutes(setHours(baseDate, fallbackHour), fallbackMinute);
  if (timeValue) {
    const [hours, minutes] = timeValue.split(":").map((part) => Number(part || 0));
    nextDate = setMinutes(setHours(baseDate, hours || 0), minutes || 0);
  }

  return nextDate;
}

function createAssignedUser(
  id: string,
  name: string,
  avatarUrl?: string | null
): CalendarAssignedUser {
  return {
    id,
    name,
    avatarUrl: avatarUrl || null,
    initials: buildInitials(name),
  };
}

function normalizeDurationHours(hours?: number | null, minutes?: number | null): number {
  return (hours || 0) + (minutes || 0) / MINUTES_PER_HOUR;
}

function getTimetrackingAssignedUser(entry: TimetrackingSource): CalendarAssignedUser | null {
  const userId =
    entry.user?.authId ||
    entry.user?.id ||
    entry.userId ||
    entry.employeeId ||
    entry.employee_id;
  if (!userId) return null;

  const userName =
    entry.userName ||
    [entry.user?.given_name, entry.user?.family_name].filter(Boolean).join(" ").trim();

  return createAssignedUser(
    String(userId),
    userName || "Collaboratore",
    entry.userPicture || entry.user?.picture || null
  );
}

function getTimetrackingReferenceDate(entry: TimetrackingSource): Date | null {
  return (
    parseDateValue(entry.start_time || entry.startTime) ||
    parseDateValue(entry.created_at) ||
    null
  );
}

type WorkdayTimeSlot = {
  startMinutes: number;
  endMinutes: number;
};

type CalendarTimeSegment = {
  start: Date;
  end: Date;
  durationMinutes: number;
};

function getWorkdayTimeSlots(date: Date): WorkdayTimeSlot[] {
  const dayOfWeek = date.getDay();

  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    return [
      { startMinutes: 7 * MINUTES_PER_HOUR, endMinutes: 12 * MINUTES_PER_HOUR },
      { startMinutes: 13 * MINUTES_PER_HOUR, endMinutes: 17 * MINUTES_PER_HOUR },
    ];
  }

  if (dayOfWeek === 5) {
    return [{ startMinutes: 7 * MINUTES_PER_HOUR, endMinutes: 13 * MINUTES_PER_HOUR }];
  }

  return [
    {
      startMinutes: FALLBACK_ATTENDANCE_START_HOUR * MINUTES_PER_HOUR,
      endMinutes: FALLBACK_ATTENDANCE_END_HOUR * MINUTES_PER_HOUR,
    },
  ];
}

function createDateAtDayMinutes(date: Date, totalMinutes: number): Date {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  return setMinutes(setHours(startOfDay(date), hours), minutes);
}

function getWorkdaySegments(date: Date): CalendarTimeSegment[] {
  return getWorkdayTimeSlots(date).map((slot) => ({
    start: createDateAtDayMinutes(date, slot.startMinutes),
    end: createDateAtDayMinutes(date, slot.endMinutes),
    durationMinutes: slot.endMinutes - slot.startMinutes,
  }));
}

function splitDurationAcrossWorkday(
  date: Date,
  startMinutes: number,
  durationMinutes: number
): { segments: CalendarTimeSegment[]; nextCursorMinutes: number } {
  const slots = getWorkdayTimeSlots(date);
  const segments: CalendarTimeSegment[] = [];

  let remainingMinutes = durationMinutes;
  let cursorMinutes = startMinutes;
  let slotIndex = 0;

  while (remainingMinutes > 0) {
    while (slotIndex < slots.length && cursorMinutes >= slots[slotIndex].endMinutes) {
      slotIndex += 1;
    }

    if (slotIndex >= slots.length) {
      segments.push({
        start: createDateAtDayMinutes(date, cursorMinutes),
        end: createDateAtDayMinutes(date, cursorMinutes + remainingMinutes),
        durationMinutes: remainingMinutes,
      });
      cursorMinutes += remainingMinutes;
      remainingMinutes = 0;
      break;
    }

    const slot = slots[slotIndex];
    if (cursorMinutes < slot.startMinutes) {
      cursorMinutes = slot.startMinutes;
    }

    const availableMinutes = slot.endMinutes - cursorMinutes;
    if (availableMinutes <= 0) {
      slotIndex += 1;
      continue;
    }

    const chunkMinutes = Math.min(remainingMinutes, availableMinutes);
    segments.push({
      start: createDateAtDayMinutes(date, cursorMinutes),
      end: createDateAtDayMinutes(date, cursorMinutes + chunkMinutes),
      durationMinutes: chunkMinutes,
    });
    cursorMinutes += chunkMinutes;
    remainingMinutes -= chunkMinutes;
  }

  return {
    segments,
    nextCursorMinutes: cursorMinutes,
  };
}

function getTaskAccentColor(task: ProjectTaskSource): string {
  if (task.is_draft || task.isDraft) return "#f59e0b";
  if (task.display_mode === "small_green" || task.displayMode === "small_green") {
    return "#22c55e";
  }
  if (task.display_mode === "small_red" || task.displayMode === "small_red") {
    return "#ef4444";
  }
  if (task.SellProduct?.category?.color) {
    return task.SellProduct.category.color;
  }
  if (task.Kanban?.color) {
    return task.Kanban.color;
  }
  return "#64748b";
}

export function buildProjectCalendarItems(
  tasks: ProjectTaskSource[],
  domain: string,
  calendarType: ProjectCalendarType = "installation"
): WeeklyCalendarItem[] {
  const items: WeeklyCalendarItem[] = [];
  const isProductionCalendar = calendarType === "production" || calendarType === "all";

  tasks.forEach((task) => {
    const calendarDate = task.deliveryDate || task.termine_produzione;
    const hasExplicitTimeRange = Boolean(task.ora_inizio && task.ora_fine);
    const scheduleDisplay: CalendarScheduleDisplay = isProductionCalendar
      ? "date-only"
      : hasExplicitTimeRange
        ? "timed"
        : "time-pending";
    const start = withTime(
      calendarDate,
      scheduleDisplay === "timed" ? task.ora_inizio : null,
      FALLBACK_TASK_START_HOUR,
      FALLBACK_TASK_START_MINUTE
    );

    if (!start) {
      return;
    }

    const end =
      withTime(
        calendarDate,
        scheduleDisplay === "timed" ? task.ora_fine : null,
        start.getHours() + 3,
        start.getMinutes()
      ) ||
      addMinutesSafe(start, FALLBACK_TASK_DURATION_MINUTES);

    const clientName = getProjectClientName(task);
    const objectName = getProjectObjectName(task);
    const status = task.column?.title || task.status || "Programmato";
    const assignedUser =
      task.squadra !== null && task.squadra !== undefined
        ? createAssignedUser(
            `squadra-${task.squadra}`,
            `Squadra ${task.squadra}`
          )
        : null;

    items.push({
      id: `task-${task.id}`,
      sourceId: task.id,
      projectId: task.id,
      projectNumber: task.unique_code || `PRO-${task.id}`,
      projectName: objectName || clientName || "Progetto senza titolo",
      projectIcon: task.SellProduct?.category?.name || task.SellProduct?.name || null,
      status,
      assignedUser,
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
      estimatedHours:
        scheduleDisplay === "timed"
          ? Math.max(1, differenceInMinutes(end, start) / MINUTES_PER_HOUR)
          : null,
      category:
        task.SellProduct?.category?.name ||
        task.SellProduct?.name ||
        task.Kanban?.title ||
        null,
      activityType: task.Kanban?.title || "Progetto",
      color: getTaskAccentColor(task),
      linkType: "project",
      detailHref: `/sites/${domain}/progetti/${task.id}`,
      secondaryHref: `/sites/${domain}/projects?edit=${task.id}`,
      timeTrackingHref: `/sites/${domain}/timetracking/create?taskId=${task.id}`,
      sourceMode: "planned",
      scheduleDisplay,
      notes: task.other || null,
      metadata: {
        clientName,
        location: task.luogo || null,
      },
    });
  });

  return items;
}

export function buildTimetrackingCalendarItems(
  entries: TimetrackingSource[],
  domain: string,
  internalActivityLabels?: Map<string, string>
): WeeklyCalendarItem[] {
  const items: WeeklyCalendarItem[] = [];

  const groupedEntries = new Map<
    string,
    Array<{
      entry: TimetrackingSource;
      referenceDate: Date;
      durationMinutes: number;
      sortTime: number;
      orderIndex: number;
    }>
  >();

  entries.forEach((entry, orderIndex) => {
    const referenceDate = getTimetrackingReferenceDate(entry);
    if (!referenceDate) {
      return;
    }

    const explicitStart = parseDateValue(entry.start_time || entry.startTime);
    const explicitEnd = parseDateValue(entry.end_time || entry.endTime);
    const explicitDurationMinutes =
      explicitStart && explicitEnd && isBefore(explicitStart, explicitEnd)
        ? differenceInMinutes(explicitEnd, explicitStart)
        : 0;
    const durationMinutes = Math.max(
      30,
      explicitDurationMinutes ||
        Math.round(normalizeDurationHours(entry.hours, entry.minutes) * MINUTES_PER_HOUR)
    );
    const assignedUserKey = String(
      entry.user?.authId ||
        entry.user?.id ||
        entry.userId ||
        entry.employeeId ||
        entry.employee_id ||
        "unknown"
    );
    const dayKey = format(referenceDate, "yyyy-MM-dd");
    const groupKey = `${assignedUserKey}-${dayKey}`;
    const group = groupedEntries.get(groupKey) || [];

    group.push({
      entry,
      referenceDate,
      durationMinutes,
      sortTime:
        parseDateValue(entry.created_at)?.getTime() ||
        explicitStart?.getTime() ||
        referenceDate.getTime(),
      orderIndex,
    });

    groupedEntries.set(groupKey, group);
  });

  groupedEntries.forEach((group) => {
    const sortedGroup = [...group].sort((left, right) => {
      if (left.sortTime !== right.sortTime) {
        return left.sortTime - right.sortTime;
      }
      return left.orderIndex - right.orderIndex;
    });

    const workdaySlots = getWorkdayTimeSlots(sortedGroup[0].referenceDate);
    let cursorMinutes =
      workdaySlots[0]?.startMinutes || FALLBACK_TIMETRACKING_START_HOUR * MINUTES_PER_HOUR;

    sortedGroup.forEach(({ entry, durationMinutes }) => {
      const roleName =
        entry.roles?.[0]?.role?.name ||
        entry.roles?.[0]?.name ||
        internalActivityLabels?.get(entry.internal_activity || "") ||
        entry.internal_activity ||
        "Consuntivo";

      const projectName =
        entry.activity_type === "internal"
          ? internalActivityLabels?.get(entry.internal_activity || "") ||
            entry.internal_activity ||
            "Attivita interna"
          : getProjectObjectName(entry.task || {}) ||
            getProjectClientName(entry.task || {}) ||
            "Progetto";

      const projectNumber =
        entry.activity_type === "internal"
          ? "INT"
          : entry.task?.unique_code || `TT-${entry.id}`;

      const assignedUser = getTimetrackingAssignedUser(entry);
      const { segments, nextCursorMinutes } = splitDurationAcrossWorkday(
        sortedGroup[0].referenceDate,
        cursorMinutes,
        durationMinutes
      );

      segments.forEach((segment, segmentIndex) => {
        items.push({
          id: `timetracking-${entry.id}-${segmentIndex}`,
          sourceId: entry.id,
          projectId: entry.task_id || null,
          projectNumber,
          projectName,
          projectIcon: entry.activity_type === "internal" ? "Attivita interna" : null,
          status: entry.activity_type === "internal" ? "Consuntivo interno" : roleName,
          assignedUser,
          startDatetime: segment.start.toISOString(),
          endDatetime: segment.end.toISOString(),
          actualHours: segment.durationMinutes / MINUTES_PER_HOUR,
          category: roleName,
          activityType:
            entry.activity_type === "internal" ? "Attivita interna" : "Consuntivo progetto",
          color: entry.activity_type === "internal" ? "#f97316" : "#2563eb",
          linkType: entry.task_id ? "project" : undefined,
          detailHref: entry.task_id ? `/sites/${domain}/progetti/${entry.task_id}` : null,
          secondaryHref: entry.task_id ? `/sites/${domain}/projects?edit=${entry.task_id}` : null,
          sourceMode: "actual",
          notes: entry.description || null,
          metadata: {
            roleName,
          },
        });
      });

      cursorMinutes = nextCursorMinutes;
    });
  });

  return items;
}

export function buildAttendanceCalendarItems(
  entries: AttendanceCalendarEntry[]
): WeeklyCalendarItem[] {
  return entries.flatMap((entry) => {
    const baseDate = parseDateValue(entry.date);
    if (!baseDate) {
      return [];
    }

    return getWorkdaySegments(baseDate).map((segment, segmentIndex) => ({
      id: `attendance-${entry.userId}-${entry.date}-${entry.status}-${segmentIndex}`,
      sourceId: `${entry.userId}-${entry.date}`,
      projectNumber: entry.status.toUpperCase().slice(0, 3),
      projectName: entry.status.replace(/_/g, " "),
      projectIcon: "Presenza",
      status: "Presenza",
      assignedUser: createAssignedUser(entry.userId, entry.userName, entry.userPicture),
      startDatetime: segment.start.toISOString(),
      endDatetime: segment.end.toISOString(),
      category: "Presenze",
      activityType: "Presenze",
      color: getAttendanceColor(entry.status),
      sourceMode: "planned",
      notes: entry.notes || null,
      metadata: {
        attendanceStatus: entry.status,
      },
    }) satisfies WeeklyCalendarItem);
  });
}

function getAttendanceColor(status: string): string {
  switch (status) {
    case "vacanze":
      return "#3b82f6";
    case "malattia":
      return "#ef4444";
    case "infortunio":
      return "#f97316";
    case "smart_working":
      return "#06b6d4";
    case "formazione":
      return "#a855f7";
    case "assenza_privata":
      return "#eab308";
    case "ipg":
      return "#ec4899";
    default:
      return "#16a34a";
  }
}

function addMinutesSafe(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function getItemMode(item: WeeklyCalendarItem): Exclude<CalendarDataMode, "both"> {
  return item.sourceMode || (item.actualHours ? "actual" : "planned");
}

export function applyCalendarFilters(
  items: WeeklyCalendarItem[],
  filters: WeeklyCalendarFilters,
  currentUserId?: string
): WeeklyCalendarItem[] {
  return items.filter((item) => {
    if (filters.mode !== "both" && getItemMode(item) !== filters.mode) {
      return false;
    }

    if (
      filters.collaborator !== "all" &&
      item.assignedUser?.id !== filters.collaborator
    ) {
      return false;
    }

    if (filters.project !== "all") {
      const projectValue = item.projectId ? String(item.projectId) : item.projectNumber;
      if (projectValue !== filters.project) {
        return false;
      }
    }

    if (filters.site !== "all") {
      const siteValue = item.siteId || item.cantiereId;
      if (String(siteValue || "") !== filters.site) {
        return false;
      }
    }

    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (
      filters.activityType !== "all" &&
      item.activityType !== filters.activityType &&
      item.category !== filters.activityType
    ) {
      return false;
    }

    if (
      filters.onlyMine &&
      currentUserId &&
      item.assignedUser?.id !== currentUserId
    ) {
      return false;
    }

    return true;
  });
}

export function filterItemsForWeek(
  items: WeeklyCalendarItem[],
  weekStart: Date
): WeeklyCalendarItem[] {
  const weekEnd = endOfDay(addDays(weekStart, 6));
  return items.filter((item) => {
    const start = parseDateValue(item.startDatetime);
    const end = parseDateValue(item.endDatetime);
    if (!start || !end) return false;

    return !isBefore(end, weekStart) && !isBefore(weekEnd, start);
  });
}

export function filterItemsForMonth(
  items: WeeklyCalendarItem[],
  monthDate: Date
): WeeklyCalendarItem[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfDay(endOfMonth(monthDate));

  return items.filter((item) => {
    const start = parseDateValue(item.startDatetime);
    const end = parseDateValue(item.endDatetime);
    if (!start || !end) return false;

    return !isBefore(end, monthStart) && !isBefore(monthEnd, start);
  });
}

export function getBusinessMonthWeeks(monthDate: Date): Date[][] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const weeks: Date[][] = [];

  let cursor = gridStart;
  while (!isBefore(gridEnd, cursor)) {
    const week: Date[] = [];
    for (let index = 0; index < 5; index += 1) {
      week.push(addDays(cursor, index));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

export function sortCalendarItemsForDay(
  left: WeeklyCalendarItem,
  right: WeeklyCalendarItem
): number {
  const leftPriority = getSchedulePriority(left.scheduleDisplay);
  const rightPriority = getSchedulePriority(right.scheduleDisplay);

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  if ((left.scheduleDisplay || "timed") === "timed") {
    const startDiff =
      (parseDateValue(left.startDatetime)?.getTime() || 0) -
      (parseDateValue(right.startDatetime)?.getTime() || 0);
    if (startDiff !== 0) {
      return startDiff;
    }
  }

  const numberDiff = String(left.projectNumber || "").localeCompare(
    String(right.projectNumber || ""),
    "it"
  );
  if (numberDiff !== 0) {
    return numberDiff;
  }

  return left.projectName.localeCompare(right.projectName, "it");
}

export function buildPositionedCalendarItems(
  items: WeeklyCalendarItem[],
  weekStart: Date,
  slotStartHour: number,
  slotEndHour: number,
  slotMinutes: number,
  slotHeight: number
): PositionedCalendarItem[] {
  const weekDays = getWeekDays(weekStart);
  const positionedItems: PositionedCalendarItem[] = [];

  weekDays.forEach((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayStart = setMinutes(setHours(startOfDay(day), slotStartHour), 0);
    const dayEnd = setMinutes(setHours(startOfDay(day), slotEndHour), 0);

    const dayItems = items
      .map((item) => {
        const itemStart = parseDateValue(item.startDatetime);
        const itemEnd = parseDateValue(item.endDatetime);
        if (!itemStart || !itemEnd) return null;
        if (!isWithinInterval(itemStart, { start: startOfDay(day), end: endOfDay(day) }) && !isWithinInterval(itemEnd, { start: startOfDay(day), end: endOfDay(day) }) && !(
          itemStart < startOfDay(day) && itemEnd > endOfDay(day)
        )) {
          return null;
        }

        const start = maxDate([itemStart, dayStart]);
        const end = minDate([itemEnd, dayEnd]);
        if (!start || !end || !isBefore(start, end)) return null;

        return {
          ...item,
          dayKey,
          start,
          end,
        };
      })
      .filter(
        (
          value
        ): value is WeeklyCalendarItem & { dayKey: string; start: Date; end: Date } =>
          Boolean(value)
      )
      .sort((left, right) => left.start.getTime() - right.start.getTime());

    const clusters: Array<Array<(typeof dayItems)[number] & { column: number }>> = [];
    let currentCluster: Array<(typeof dayItems)[number] & { column: number }> = [];
    let active: Array<{ end: Date; column: number }> = [];

    dayItems.forEach((item) => {
      active = active.filter((entry) => isBefore(item.start, entry.end));
      if (active.length === 0 && currentCluster.length > 0) {
        clusters.push(currentCluster);
        currentCluster = [];
      }

      const usedColumns = new Set(active.map((entry) => entry.column));
      let column = 0;
      while (usedColumns.has(column)) {
        column += 1;
      }

      active.push({ end: item.end, column });
      currentCluster.push({ ...item, column });
    });

    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    clusters.forEach((cluster) => {
      const columnCount = Math.max(
        1,
        cluster.reduce((maxColumns, item) => Math.max(maxColumns, item.column + 1), 1)
      );

      cluster.forEach((item) => {
        const minutesFromStart = differenceInMinutes(item.start, dayStart);
        const durationMinutes = Math.max(slotMinutes, differenceInMinutes(item.end, item.start));

        positionedItems.push({
          ...item,
          top: (minutesFromStart / slotMinutes) * slotHeight,
          height: Math.max(slotHeight, (durationMinutes / slotMinutes) * slotHeight - 6),
          column: item.column,
          columnCount,
          isConflict: columnCount > 1,
        });
      });
    });
  });

  return positionedItems;
}

export function createDefaultFilters(defaultOnlyMine = false): WeeklyCalendarFilters {
  return {
    collaborator: "all",
    project: "all",
    site: "all",
    status: "all",
    activityType: "all",
    mode: "both",
    onlyMine: defaultOnlyMine,
  };
}

function upsertSummaryBucket(
  buckets: Map<string, CalendarSummaryBucket>,
  key: string,
  label: string,
  plannedMinutes: number,
  actualMinutes: number
) {
  const current = buckets.get(key) || {
    label,
    plannedMinutes: 0,
    actualMinutes: 0,
  };

  current.plannedMinutes += plannedMinutes;
  current.actualMinutes += actualMinutes;
  buckets.set(key, current);
}

export function calculateCalendarSummary(
  items: WeeklyCalendarItem[],
  weekStart: Date,
  targetConfig?: WeeklyCalendarTargetConfig
): CalendarSummaryData {
  const byDay = new Map<string, CalendarSummaryBucket>();
  const byProject = new Map<string, CalendarSummaryBucket>();
  const byCollaborator = new Map<string, CalendarSummaryBucket>();
  const incompleteDays: CalendarSummaryData["incompleteDays"] = [];

  let totalPlannedMinutes = 0;
  let totalActualMinutes = 0;
  const weekDays = getWeekDays(weekStart);

  items.forEach((item) => {
    const start = parseDateValue(item.startDatetime);
    const end = parseDateValue(item.endDatetime);
    if (!start || !end) return;

    const shouldInferPlannedDuration =
      getItemMode(item) === "planned" && (item.scheduleDisplay || "timed") === "timed";
    const durationMinutes = Math.max(0, differenceInMinutes(end, start));
    const plannedMinutes = Math.round(
      (
        (
          item.estimatedHours ??
          (shouldInferPlannedDuration ? durationMinutes / MINUTES_PER_HOUR : 0)
        ) || 0
      ) * MINUTES_PER_HOUR
    );
    const actualMinutes = Math.round(
      ((item.actualHours ?? (getItemMode(item) === "actual" ? durationMinutes / MINUTES_PER_HOUR : 0)) || 0) *
        MINUTES_PER_HOUR
    );

    totalPlannedMinutes += plannedMinutes;
    totalActualMinutes += actualMinutes;

    const dayKey = format(start, "yyyy-MM-dd");
    const dayLabel = format(start, "EEE d", { locale: it });
    upsertSummaryBucket(byDay, dayKey, dayLabel, plannedMinutes, actualMinutes);

    const projectKey = String(item.projectId || item.projectNumber || item.projectName);
    const projectLabel = item.projectNumber
      ? `${item.projectNumber} - ${item.projectName}`
      : item.projectName;
    upsertSummaryBucket(byProject, projectKey, projectLabel, plannedMinutes, actualMinutes);

    if (item.assignedUser) {
      upsertSummaryBucket(
        byCollaborator,
        item.assignedUser.id,
        item.assignedUser.name,
        plannedMinutes,
        actualMinutes
      );
    }
  });

  if (targetConfig) {
    getWeekDays(weekStart).forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const isFriday = format(day, "i") === "5";
      const targetMinutes =
        (isFriday ? targetConfig.fridayMinutes : undefined) ??
        targetConfig.weekdayMinutes;
      const current = byDay.get(dayKey);
      const coveredMinutes = Math.max(
        current?.actualMinutes || 0,
        current?.plannedMinutes || 0
      );

      if (coveredMinutes < targetMinutes) {
        incompleteDays.push({
          date: dayKey,
          label: format(day, "EEEE d MMM", { locale: it }),
          deficitMinutes: targetMinutes - coveredMinutes,
        });
      }
    });
  }

  return {
    totalPlannedMinutes,
    totalActualMinutes,
    differenceMinutes: totalActualMinutes - totalPlannedMinutes,
    conflictCount: buildPositionedCalendarItems(
      items,
      weekStart,
      DEFAULT_SLOT_START_HOUR,
      DEFAULT_SLOT_END_HOUR,
      DEFAULT_SLOT_MINUTES,
      26
    ).filter((item) => item.isConflict).length,
    incompleteDays,
    byDay: weekDays.map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      return (
        byDay.get(dayKey) || {
          label: format(day, "EEE d", { locale: it }),
          plannedMinutes: 0,
          actualMinutes: 0,
        }
      );
    }),
    byProject: Array.from(byProject.values()).sort(
      (left, right) =>
        right.actualMinutes +
          right.plannedMinutes -
        (left.actualMinutes + left.plannedMinutes)
    ),
    byCollaborator: Array.from(byCollaborator.values()).sort(
      (left, right) =>
        right.actualMinutes +
          right.plannedMinutes -
        (left.actualMinutes + left.plannedMinutes)
    ),
  };
}

export function getStatusLegend(items: WeeklyCalendarItem[]): Array<{
  label: string;
  color: string;
}> {
  const legend = new Map<string, string>();
  items.forEach((item) => {
    const label = item.status || item.category || item.activityType;
    if (!label) return;
    legend.set(label, item.color || "#64748b");
  });

  return Array.from(legend.entries()).map(([label, color]) => ({
    label,
    color,
  }));
}

export function isTodayInWeek(day: Date): boolean {
  return isSameDay(day, new Date());
}

function getSchedulePriority(scheduleDisplay?: CalendarScheduleDisplay): number {
  switch (scheduleDisplay) {
    case "time-pending":
      return 1;
    case "date-only":
      return 2;
    case "timed":
    default:
      return 0;
  }
}
