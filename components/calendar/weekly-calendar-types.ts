import type { Roles, Task, Timetracking, User } from "@/types/supabase";
import type { CalendarEventKind } from "@/lib/calendar/mapTaskToEvents";

export type CalendarLinkType = "project" | "site";

export type CalendarDataMode = "planned" | "actual" | "both";

export type CalendarScheduleDisplay = "timed" | "time-pending" | "date-only";

export interface CalendarAssignedUser {
  id: string;
  name: string;
  initials?: string | null;
  avatarUrl?: string | null;
  color?: string | null;
}

export interface WeeklyCalendarItem {
  id: string;
  sourceId?: string | number;
  projectId?: string | number | null;
  siteId?: string | number | null;
  cantiereId?: string | number | null;
  projectNumber?: string | null;
  projectName: string;
  projectIcon?: string | null;
  status?: string | null;
  assignedUser?: CalendarAssignedUser | null;
  collaborators?: CalendarAssignedUser[];
  startDatetime: string;
  endDatetime: string;
  estimatedHours?: number | null;
  actualHours?: number | null;
  category?: string | null;
  activityType?: string | null;
  color?: string | null;
  linkType?: CalendarLinkType;
  detailHref?: string | null;
  secondaryHref?: string | null;
  timeTrackingHref?: string | null;
  sourceMode?: Exclude<CalendarDataMode, "both">;
  scheduleDisplay?: CalendarScheduleDisplay;
  notes?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  /** Campi valorizzati solo per i calendari progetto (da `mapTaskToEvents`). */
  eventKind?: CalendarEventKind;
  /** Evento da rendere nella fascia giornaliera, mai nella griglia oraria. */
  allDay?: boolean;
  /** `yyyy-MM-dd`, estremi inclusi. */
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  /** `HH:mm` della fase, anche quando l'evento e' all-day. */
  timeStart?: string | null;
  timeEnd?: string | null;
  missingDate?: boolean;
  isLate?: boolean;
  /** Categoria Kanban del progetto (fonte del colore nel calendario v2). */
  kanbanCategory?: { name: string; color: string | null } | null;
}

export interface WeeklyCalendarTimetrackingEntry extends Timetracking {
  roles?: Array<{
    role?: {
      id?: number;
      name?: string;
    };
  }>;
}

export interface WeeklyCalendarTimetrackingEditConfig {
  entries: WeeklyCalendarTimetrackingEntry[];
  users: User[];
  roles: Roles[];
  tasks: Task[];
}

export interface CalendarFilterOption {
  value: string;
  label: string;
}

export interface WeeklyCalendarFilters {
  collaborator: string;
  project: string;
  site: string;
  status: string;
  activityType: string;
  mode: CalendarDataMode;
  onlyMine: boolean;
}

export interface WeeklyCalendarTargetConfig {
  weekdayMinutes: number;
  fridayMinutes?: number;
}

export interface CalendarSummaryBucket {
  label: string;
  plannedMinutes: number;
  actualMinutes: number;
}

export interface CalendarSummaryData {
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  differenceMinutes: number;
  conflictCount: number;
  incompleteDays: Array<{
    date: string;
    label: string;
    deficitMinutes: number;
  }>;
  byDay: CalendarSummaryBucket[];
  byProject: CalendarSummaryBucket[];
  byCollaborator: CalendarSummaryBucket[];
}
