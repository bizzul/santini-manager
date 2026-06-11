/**
 * Client-safe types and parser for the per-site HR settings stored in
 * `site_settings` under the `hr_settings` key.
 *
 * v2 adds the contract parameters used by the collaborator dashboard to
 * compute hour/vacation balances. Old payloads ({ hourlyRates }) parse fine:
 * missing fields fall back to the site defaults.
 */
export const HR_SETTING_KEY = "hr_settings";

export const DEFAULT_WEEKLY_HOURS = 42;
export const DEFAULT_VACATION_DAYS = 25;

export interface HrSettings {
    /** Hourly cost per User.id. */
    hourlyRates: Record<string, number | null>;
    /** Contract weekly hours per User.id (null = use site default). */
    weeklyHours: Record<string, number | null>;
    /** Vacation days per year per User.id (null = use site default). */
    vacationDays: Record<string, number | null>;
    /** Site-wide default contract weekly hours. */
    defaultWeeklyHours: number;
    /** Site-wide default vacation days per year. */
    defaultVacationDays: number;
}

function parseNumberMap(value: unknown): Record<string, number | null> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: Record<string, number | null> = {};
    for (const [key, raw] of Object.entries(value)) {
        if (raw === null) {
            result[key] = null;
        } else if (typeof raw === "number" && Number.isFinite(raw)) {
            result[key] = raw;
        }
    }
    return result;
}

function parsePositiveNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : fallback;
}

export function parseHrSettings(value: unknown): HrSettings {
    const raw = value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    return {
        hourlyRates: parseNumberMap(raw.hourlyRates),
        weeklyHours: parseNumberMap(raw.weeklyHours),
        vacationDays: parseNumberMap(raw.vacationDays),
        defaultWeeklyHours: parsePositiveNumber(
            raw.defaultWeeklyHours,
            DEFAULT_WEEKLY_HOURS,
        ),
        defaultVacationDays: parsePositiveNumber(
            raw.defaultVacationDays,
            DEFAULT_VACATION_DAYS,
        ),
    };
}

/** Contract weekly hours for a user, falling back to the site default. */
export function resolveWeeklyHours(
    settings: HrSettings,
    userId: string | number,
): number {
    const value = settings.weeklyHours[String(userId)];
    return value != null && value > 0 ? value : settings.defaultWeeklyHours;
}

/** Vacation days per year for a user, falling back to the site default. */
export function resolveVacationDays(
    settings: HrSettings,
    userId: string | number,
): number {
    const value = settings.vacationDays[String(userId)];
    return value != null && value > 0 ? value : settings.defaultVacationDays;
}
