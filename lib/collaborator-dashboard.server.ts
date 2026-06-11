// Server-only aggregation for the collaborator dashboard page.
// Key mapping: `User.id` (integer) is used by Timetracking (`employee_id`)
// and by `hr_settings` maps; `User.authId` (UUID) is used by `user_sites`,
// `attendance_entries` and `leave_requests`.
//
// Uses the service client because user_sites / timetracking RLS only exposes
// the caller's own rows via the session client (same reason as
// fetchCollaborators). Authorization is enforced by the page: admins see
// everyone, regular users only their own dashboard.
import { createServiceClient } from "@/utils/supabase/server";
import { cache } from "react";
import {
    HR_SETTING_KEY,
    parseHrSettings,
    resolveVacationDays,
    resolveWeeklyHours,
    type HrSettings,
} from "@/lib/hr-settings";

export interface CollaboratorProfile {
    id: number;
    authId: string;
    fullName: string;
    email: string | null;
    picture: string | null;
    color: string | null;
    initials: string;
    role: string | null;
    companyRole: string | null;
    enabled: boolean;
    activationStatus: string | null;
    joinedSiteAt: string | null;
    assignedRoles: string[];
    /** Hourly cost from hr_settings (admin-only display). */
    hourlyRate: number | null;
    weeklyHours: number;
    vacationDaysPerYear: number;
}

export interface HoursBucket {
    /** Label, e.g. "Gen 2026" or "Sett. 12". */
    label: string;
    hours: number;
}

export interface CollaboratorProjectRow {
    key: string;
    label: string;
    client: string | null;
    /** Relative link (e.g. "/projects") or null for internal activities. */
    isInternal: boolean;
    hours: number;
    entries: number;
    lastEntryAt: string | null;
}

export interface CollaboratorDashboardData {
    profile: CollaboratorProfile;
    /** Hours worked, current calendar year. */
    yearHours: number;
    /** Expected hours year-to-date based on contract weekly hours. */
    expectedYearHours: number;
    /** yearHours - expectedYearHours. */
    hoursBalance: number;
    /** Vacation days used in the current year (attendance status "vacanze"). */
    vacationUsed: number;
    vacationRemaining: number;
    hoursPerMonth: HoursBucket[];
    hoursPerWeek: HoursBucket[];
    projects: CollaboratorProjectRow[];
    /** Attendance status counts, current year (e.g. presente, malattia...). */
    attendanceCounts: Record<string, number>;
    leaveRequests: Array<{
        id: string | number;
        leaveType: string;
        startDate: string;
        endDate: string;
        status: string;
    }>;
}

function entryHours(item: {
    totalTime: number | null;
    hours: number | null;
    minutes: number | null;
}): number {
    const stored = Number(item.totalTime);
    if (Number.isFinite(stored) && stored > 0) return stored;
    const hours = Number(item.hours || 0);
    const minutes = Number(item.minutes || 0);
    return Number((hours + minutes / 60).toFixed(2));
}

function getInitials(label: string): string {
    return label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "?";
}

/** Mon-Fri days elapsed in the current year, up to and including today. */
function workingDaysElapsedThisYear(now: Date): number {
    const start = new Date(now.getFullYear(), 0, 1);
    let count = 0;
    const cursor = new Date(start);
    while (cursor <= now) {
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) count += 1;
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
}

const MONTH_LABELS = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
];

/** ISO week number (1-53). */
function isoWeek(date: Date): number {
    const target = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNumber = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNumber + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
    return (
        1 +
        Math.round(
            (target.getTime() - firstThursday.getTime()) /
                (7 * 24 * 3600 * 1000),
        )
    );
}

const INTERNAL_ACTIVITY_LABELS: Record<string, string> = {
    formazione: "Formazione",
    pulizie: "Pulizie",
    manutenzione: "Manutenzione",
    riunione: "Riunione",
    altro: "Altro",
};

export const getCollaboratorDashboard = cache(
    async (params: {
        siteId: string;
        userId: number;
    }): Promise<CollaboratorDashboardData | null> => {
        const { siteId, userId } = params;
        const supabase = createServiceClient();

        const { data: user } = await supabase
            .from("User")
            .select(
                "id, authId, email, given_name, family_name, picture, color, enabled, role, company_role, activation_status",
            )
            .eq("id", userId)
            .maybeSingle();

        if (!user?.authId) return null;

        // The collaborator must belong to this site.
        const { data: siteLink } = await supabase
            .from("user_sites")
            .select("created_at")
            .eq("site_id", siteId)
            .eq("user_id", user.authId)
            .maybeSingle();

        if (!siteLink) return null;

        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const twelveMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 11,
            1,
        );

        const [
            rolesResult,
            timetrackingResult,
            attendanceResult,
            leaveResult,
            hrSettingResult,
        ] = await Promise.all([
            supabase
                .from("_RolesToUser")
                .select("A, B")
                .eq("B", user.id),
            supabase
                .from("Timetracking")
                .select(
                    "id, created_at, hours, minutes, totalTime, activity_type, internal_activity, task:task_id(id, unique_code, title, name, Client:clientId(businessName, individualFirstName, individualLastName))",
                )
                .eq("employee_id", user.id)
                .gte("created_at", twelveMonthsAgo.toISOString())
                .order("created_at", { ascending: false }),
            supabase
                .from("attendance_entries")
                .select("date, status")
                .eq("site_id", siteId)
                .eq("user_id", user.authId)
                .gte("date", yearStart.toISOString().slice(0, 10)),
            supabase
                .from("leave_requests")
                .select("id, leave_type, start_date, end_date, status")
                .eq("site_id", siteId)
                .eq("user_id", user.authId)
                .order("start_date", { ascending: false })
                .limit(8),
            supabase
                .from("site_settings")
                .select("setting_value")
                .eq("site_id", siteId)
                .eq("setting_key", HR_SETTING_KEY)
                .maybeSingle(),
        ]);

        const hrSettings: HrSettings = parseHrSettings(
            hrSettingResult.data?.setting_value,
        );

        const fullName = [user.given_name, user.family_name]
            .filter(Boolean)
            .join(" ") || user.email || "Collaboratore";

        // _RolesToUser: A = Roles.id, B = User.id (two-step lookup, same
        // pattern as fetchCollaborators).
        const roleIds = ((rolesResult.data ?? []) as { A: number }[])
            .map((row) => row.A)
            .filter((id) => id != null);
        let assignedRoles: string[] = [];
        if (roleIds.length > 0) {
            const { data: roles } = await supabase
                .from("Roles")
                .select("id, name")
                .in("id", roleIds);
            assignedRoles = ((roles ?? []) as {
                id: number;
                name: string | null;
            }[])
                .map((role) => role.name)
                .filter((name): name is string => Boolean(name));
        }

        const weeklyHours = resolveWeeklyHours(hrSettings, user.id);
        const vacationDaysPerYear = resolveVacationDays(hrSettings, user.id);
        const rawRate = hrSettings.hourlyRates[String(user.id)];
        const hourlyRate = rawRate != null && rawRate > 0 ? rawRate : null;

        const profile: CollaboratorProfile = {
            id: user.id,
            authId: user.authId,
            fullName,
            email: user.email ?? null,
            picture: user.picture ?? null,
            color: user.color ?? null,
            initials: getInitials(fullName),
            role: user.role ?? null,
            companyRole: user.company_role ?? null,
            enabled: user.enabled !== false,
            activationStatus: user.activation_status ?? null,
            joinedSiteAt: siteLink.created_at ?? null,
            assignedRoles,
            hourlyRate,
            weeklyHours,
            vacationDaysPerYear,
        };

        /* ----------------------------- hours ----------------------------- */

        type TaskRel = {
            id: number;
            unique_code: string | null;
            title: string | null;
            name: string | null;
            Client:
                | {
                    businessName: string | null;
                    individualFirstName: string | null;
                    individualLastName: string | null;
                }
                | {
                    businessName: string | null;
                    individualFirstName: string | null;
                    individualLastName: string | null;
                }[]
                | null;
        };
        type EntryRow = {
            id: number;
            created_at: string;
            hours: number | null;
            minutes: number | null;
            totalTime: number | null;
            activity_type: string | null;
            internal_activity: string | null;
            task: TaskRel | TaskRel[] | null;
        };

        const entries = (timetrackingResult.data ?? []) as EntryRow[];

        // Month buckets (last 12 months) and week buckets (last 12 ISO weeks).
        const monthBuckets: HoursBucket[] = Array.from(
            { length: 12 },
            (_, index) => {
                const date = new Date(
                    now.getFullYear(),
                    now.getMonth() - 11 + index,
                    1,
                );
                return {
                    label: `${MONTH_LABELS[date.getMonth()]} ${
                        String(date.getFullYear()).slice(2)
                    }`,
                    hours: 0,
                };
            },
        );
        const monthIndex = (date: Date) =>
            (date.getFullYear() - twelveMonthsAgo.getFullYear()) * 12 +
            date.getMonth() - twelveMonthsAgo.getMonth();

        const weekKeys: string[] = [];
        const weekMap = new Map<string, HoursBucket>();
        for (let offset = 11; offset >= 0; offset -= 1) {
            const date = new Date(now);
            date.setDate(date.getDate() - offset * 7);
            const key = `${date.getFullYear()}-W${isoWeek(date)}`;
            if (!weekMap.has(key)) {
                weekKeys.push(key);
                weekMap.set(key, {
                    label: `Sett. ${isoWeek(date)}`,
                    hours: 0,
                });
            }
        }

        let yearHours = 0;
        const projectMap = new Map<string, CollaboratorProjectRow>();

        for (const entry of entries) {
            const hours = entryHours(entry);
            const createdAt = new Date(entry.created_at);

            const mIndex = monthIndex(createdAt);
            if (mIndex >= 0 && mIndex < monthBuckets.length) {
                monthBuckets[mIndex].hours += hours;
            }

            const weekKey = `${createdAt.getFullYear()}-W${isoWeek(createdAt)}`;
            const weekBucket = weekMap.get(weekKey);
            if (weekBucket) weekBucket.hours += hours;

            if (createdAt >= yearStart) yearHours += hours;

            // Projects / internal activities grouping.
            const task = Array.isArray(entry.task)
                ? entry.task[0] ?? null
                : entry.task;
            let key: string;
            let label: string;
            let client: string | null = null;
            let isInternal = false;

            if (task) {
                key = `task-${task.id}`;
                label = task.title || task.name || task.unique_code ||
                    `Progetto ${task.id}`;
                const taskClient = Array.isArray(task.Client)
                    ? task.Client[0] ?? null
                    : task.Client;
                client = taskClient?.businessName ||
                    [
                            taskClient?.individualFirstName,
                            taskClient?.individualLastName,
                        ].filter(Boolean).join(" ") ||
                    null;
            } else {
                isInternal = true;
                const activity = entry.internal_activity || "altro";
                key = `internal-${activity}`;
                label = INTERNAL_ACTIVITY_LABELS[activity] ||
                    activity.charAt(0).toUpperCase() + activity.slice(1);
            }

            const row = projectMap.get(key) ?? {
                key,
                label,
                client,
                isInternal,
                hours: 0,
                entries: 0,
                lastEntryAt: null,
            };
            row.hours += hours;
            row.entries += 1;
            if (!row.lastEntryAt || entry.created_at > row.lastEntryAt) {
                row.lastEntryAt = entry.created_at;
            }
            projectMap.set(key, row);
        }

        const projects = Array.from(projectMap.values())
            .map((row) => ({ ...row, hours: Number(row.hours.toFixed(2)) }))
            .sort((a, b) => b.hours - a.hours);

        for (const bucket of monthBuckets) {
            bucket.hours = Number(bucket.hours.toFixed(2));
        }
        const weekBuckets = weekKeys
            .map((key) => weekMap.get(key)!)
            .map((bucket) => ({
                ...bucket,
                hours: Number(bucket.hours.toFixed(2)),
            }));

        /* ---------------------------- balances ---------------------------- */

        // Expected hours year-to-date: contract weekly hours spread over a
        // 5-day week, times the Mon-Fri days elapsed in the current year.
        const expectedYearHours = Number(
            ((weeklyHours / 5) * workingDaysElapsedThisYear(now)).toFixed(2),
        );
        const hoursBalance = Number(
            (yearHours - expectedYearHours).toFixed(2),
        );

        const attendanceRows = (attendanceResult.data ?? []) as {
            date: string;
            status: string | null;
        }[];
        const attendanceCounts: Record<string, number> = {};
        for (const row of attendanceRows) {
            const status = row.status || "presente";
            attendanceCounts[status] = (attendanceCounts[status] ?? 0) + 1;
        }
        const vacationUsed = attendanceCounts["vacanze"] ?? 0;
        const vacationRemaining = Number(
            (vacationDaysPerYear - vacationUsed).toFixed(1),
        );

        const leaveRequests = ((leaveResult.data ?? []) as {
            id: string | number;
            leave_type: string | null;
            start_date: string;
            end_date: string;
            status: string | null;
        }[]).map((row) => ({
            id: row.id,
            leaveType: row.leave_type || "vacanze",
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status || "pending",
        }));

        return {
            profile,
            yearHours: Number(yearHours.toFixed(2)),
            expectedYearHours,
            hoursBalance,
            vacationUsed,
            vacationRemaining,
            hoursPerMonth: monthBuckets,
            hoursPerWeek: weekBuckets,
            projects,
            attendanceCounts,
            leaveRequests,
        };
    },
);
