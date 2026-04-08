import type { Roles, Task, Timetracking, User } from "@/types/supabase";

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
