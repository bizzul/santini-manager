import { z } from "zod";
import { parseLocalDate } from "@/lib/utils";

/**
 * Parse edit-form dates without the UTC midnight shift of `new Date("YYYY-MM-DD")`.
 * Date-only strings are interpreted as local calendar days, matching create-item.
 */
export function parseTimetrackingEditDate(val: unknown): Date | undefined {
  if (val == null || val === "") return undefined;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? undefined : val;
  }
  if (typeof val === "number") {
    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof val !== "string") return undefined;

  const trimmed = val.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseLocalDate(trimmed);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function finiteNumber(val: unknown, fallback = 0): number {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalScalar(val: unknown): string | number | undefined {
  if (val == null || val === "") return undefined;
  if (typeof val === "string" || typeof val === "number") return val;
  return undefined;
}

/**
 * Inline table edits may send a role id, a join-table row, or `{ role: { id, name } }`.
 * Normalize all of those to a scalar id so validation does not fail.
 */
export function parseTimetrackingRoleId(
  val: unknown
): string | number | undefined {
  if (val == null || val === "") return undefined;
  if (typeof val === "number" || typeof val === "string") return val;
  if (Array.isArray(val)) return parseTimetrackingRoleId(val[0]);
  if (typeof val === "object") {
    const obj = val as { role?: { id?: string | number }; id?: string | number; A?: string | number };
    return parseTimetrackingRoleId(obj.role?.id ?? obj.id ?? obj.A);
  }
  return undefined;
}

export const validation = z.object({
  description: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().optional()
  ),
  descriptionCat: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  hours: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return finiteNumber(val);
  }, z.number().optional()),
  minutes: z.preprocess((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return finiteNumber(val);
  }, z.number().optional()),
  task: z.preprocess(optionalScalar, z.union([z.string(), z.number()]).optional()),
  userId: z.preprocess(
    optionalScalar,
    z.union([z.string(), z.number()]).optional()
  ),
  roles: z.preprocess(
    parseTimetrackingRoleId,
    z.union([z.number(), z.string()]).optional()
  ),
  // Support both date and created_at for flexibility
  date: z.preprocess(parseTimetrackingEditDate, z.date().optional()),
  created_at: z.preprocess(parseTimetrackingEditDate, z.date().optional()),
  lunchOffsite: z.preprocess(
    (val) => (val == null ? undefined : Boolean(val)),
    z.boolean().optional()
  ),
  lunchLocation: z.preprocess(
    (val) => (val == null ? "" : val),
    z.string().optional()
  ),
});

/**
 * Client-side schema for the edit dialog. Keeps `date` as a datetime-local
 * string so react-hook-form does not fail after the server schema converts
 * it to a Date object.
 */
export const editFormSchema = z.object({
  date: z.string().min(1, "Seleziona una data"),
  description: z.string().optional(),
  hours: z.coerce.number().min(0, "Ore non valide").max(24, "Max 24 ore"),
  minutes: z.coerce.number().min(0, "Minuti non validi").max(59, "Max 59 minuti"),
  roles: z.string().optional(),
  task: z.string().optional(),
  userId: z.string().optional(),
});

export type EditFormValues = z.infer<typeof editFormSchema>;
