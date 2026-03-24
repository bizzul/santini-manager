export const DEFAULT_PROJECT_HOURLY_RATE = 65;

export interface CollaboratorTimeSummary {
  employeeId: string;
  name: string;
  hours: number;
  entries: number;
}

export interface CollaboratorCostSummary extends CollaboratorTimeSummary {
  hourlyRate: number;
  totalCost: number;
  usesCustomRate: boolean;
}

export interface ProjectCostSnapshot {
  defaultHourlyRate: number;
  collaboratorRates: Record<string, number>;
  collaborators: CollaboratorCostSummary[];
  totalTrackedHours: number;
  registeredMaterialCost: number;
  manualMaterialCost: number;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalProjectCost: number;
  projectValue: number;
  margin: number;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseNumber(
  value: unknown,
  fallback = 0,
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return fallback;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function normalizeHourlyRate(value: unknown): number {
  const parsed = roundCurrency(parseNumber(value, DEFAULT_PROJECT_HOURLY_RATE));
  return parsed > 0 ? parsed : DEFAULT_PROJECT_HOURLY_RATE;
}

export function normalizeMaterialCost(value: unknown): number {
  return Math.max(0, roundCurrency(parseNumber(value, 0)));
}

export function normalizeCollaboratorRates(
  value: unknown,
  defaultHourlyRate = DEFAULT_PROJECT_HOURLY_RATE,
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalizedDefault = normalizeHourlyRate(defaultHourlyRate);
  const output: Record<string, number> = {};

  Object.entries(value).forEach(([employeeId, rawRate]) => {
    if (!employeeId) return;
    const parsedRate = roundCurrency(parseNumber(rawRate, normalizedDefault));
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) return;
    if (Math.abs(parsedRate - normalizedDefault) < 0.005) return;
    output[employeeId] = parsedRate;
  });

  return output;
}

export function getEntryHours(entry: {
  totalTime?: unknown;
  hours?: unknown;
  minutes?: unknown;
}): number {
  const totalTime = parseNumber(entry?.totalTime, 0);
  if (Number.isFinite(totalTime) && totalTime > 0) {
    return totalTime;
  }

  return parseNumber(entry?.hours, 0) + parseNumber(entry?.minutes, 0) / 60;
}

export function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0h";
  }

  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded.toFixed(1)}h`;
}

export function formatSwissCurrency(
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat("it-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function buildCollaboratorTimeSummaries(
  timeEntries: Array<{
    id?: string | number;
    employee_id?: string | number | null;
    user?: {
      id?: string | number | null;
      given_name?: string | null;
      family_name?: string | null;
    } | Array<{
      id?: string | number | null;
      given_name?: string | null;
      family_name?: string | null;
    }> | null;
    totalTime?: unknown;
    hours?: unknown;
    minutes?: unknown;
  }>,
): CollaboratorTimeSummary[] {
  const aggregated = timeEntries.reduce((map, entry) => {
    const rawUser = Array.isArray(entry.user) ? entry.user[0] : entry.user;
    const name =
      `${rawUser?.given_name || ""} ${rawUser?.family_name || ""}`.trim() ||
      "Collaboratore";
    const employeeId =
      entry.employee_id != null
        ? String(entry.employee_id)
        : rawUser?.id != null
          ? String(rawUser.id)
          : `unknown-${name}-${entry.id ?? map.size + 1}`;

    const current = map.get(employeeId) || {
      employeeId,
      name,
      hours: 0,
      entries: 0,
    };

    current.hours += getEntryHours(entry);
    current.entries += 1;
    map.set(employeeId, current);
    return map;
  }, new Map<string, CollaboratorTimeSummary>());

  return Array.from(aggregated.values())
    .map((collaborator) => ({
      ...collaborator,
      hours: roundCurrency(collaborator.hours),
    }))
    .sort((a, b) => b.hours - a.hours);
}

export function buildProjectCostSnapshot({
  collaborators,
  projectValue,
  registeredMaterialCost,
  manualMaterialCost,
  defaultHourlyRate,
  collaboratorRates,
}: {
  collaborators: CollaboratorTimeSummary[];
  projectValue?: unknown;
  registeredMaterialCost?: unknown;
  manualMaterialCost?: unknown;
  defaultHourlyRate?: unknown;
  collaboratorRates?: unknown;
}): ProjectCostSnapshot {
  const normalizedProjectValue = Math.max(0, roundCurrency(parseNumber(projectValue, 0)));
  const normalizedRegisteredMaterialCost = normalizeMaterialCost(
    registeredMaterialCost,
  );
  const normalizedManualMaterialCost = normalizeMaterialCost(manualMaterialCost);
  const normalizedDefaultHourlyRate = normalizeHourlyRate(defaultHourlyRate);
  const normalizedCollaboratorRates = normalizeCollaboratorRates(
    collaboratorRates,
    normalizedDefaultHourlyRate,
  );

  const collaboratorCostRows = collaborators.map((collaborator) => {
    const customRate = normalizedCollaboratorRates[collaborator.employeeId];
    const hourlyRate = customRate ?? normalizedDefaultHourlyRate;
    const totalCost = roundCurrency(collaborator.hours * hourlyRate);

    return {
      ...collaborator,
      hourlyRate,
      totalCost,
      usesCustomRate: customRate != null,
    };
  });

  const totalTrackedHours = roundCurrency(
    collaboratorCostRows.reduce((sum, collaborator) => sum + collaborator.hours, 0),
  );
  const totalLaborCost = roundCurrency(
    collaboratorCostRows.reduce((sum, collaborator) => sum + collaborator.totalCost, 0),
  );
  const totalMaterialCost = roundCurrency(
    normalizedRegisteredMaterialCost + normalizedManualMaterialCost,
  );
  const totalProjectCost = roundCurrency(totalLaborCost + totalMaterialCost);
  const margin = roundCurrency(normalizedProjectValue - totalProjectCost);

  return {
    defaultHourlyRate: normalizedDefaultHourlyRate,
    collaboratorRates: normalizedCollaboratorRates,
    collaborators: collaboratorCostRows,
    totalTrackedHours,
    registeredMaterialCost: normalizedRegisteredMaterialCost,
    manualMaterialCost: normalizedManualMaterialCost,
    totalMaterialCost,
    totalLaborCost,
    totalProjectCost,
    projectValue: normalizedProjectValue,
    margin,
  };
}
