import { setHours, setMinutes, startOfDay } from "date-fns";
import type { WeekSlotConfig } from "@/components/calendar/week/useOverlapLayout";

export const DROPPABLE_GRID_PREFIX = "day-grid:";
export const DROPPABLE_UNSCHEDULED_PREFIX = "day-unscheduled:";

/** Durata di default (minuti) quando una card non ha ore stimate. */
export const DEFAULT_EVENT_DURATION_MINUTES = 180;
/** Snap del drop sulla griglia (minuti). */
export const DROP_SNAP_MINUTES = 15;

export type DropTargetKind = "grid" | "unscheduled";

export interface ParsedDropTarget {
  kind: DropTargetKind;
  dayKey: string;
}

export function makeGridDroppableId(dayKey: string): string {
  return `${DROPPABLE_GRID_PREFIX}${dayKey}`;
}

export function makeUnscheduledDroppableId(dayKey: string): string {
  return `${DROPPABLE_UNSCHEDULED_PREFIX}${dayKey}`;
}

export function parseDropTarget(droppableId: string | null | undefined): ParsedDropTarget | null {
  if (!droppableId) return null;
  if (droppableId.startsWith(DROPPABLE_GRID_PREFIX)) {
    return { kind: "grid", dayKey: droppableId.slice(DROPPABLE_GRID_PREFIX.length) };
  }
  if (droppableId.startsWith(DROPPABLE_UNSCHEDULED_PREFIX)) {
    return {
      kind: "unscheduled",
      dayKey: droppableId.slice(DROPPABLE_UNSCHEDULED_PREFIX.length),
    };
  }
  return null;
}

/**
 * Converte la posizione verticale del bordo superiore della card rilasciata
 * (relativa al top della griglia del giorno) in minuti dall'inizio della
 * giornata operativa, con snap a `DROP_SNAP_MINUTES`. Restituisce null se i
 * dati di posizione non sono affidabili (es. drop da tastiera).
 */
export function resolveDropMinutes(
  cardTop: number | null | undefined,
  gridTop: number | null | undefined,
  config: WeekSlotConfig
): number | null {
  if (
    cardTop == null ||
    gridTop == null ||
    Number.isNaN(cardTop) ||
    Number.isNaN(gridTop)
  ) {
    return null;
  }

  const offsetY = cardTop - gridTop;
  const rawMinutes = (offsetY / config.slotHeight) * config.slotMinutes;
  const snapped = Math.round(rawMinutes / DROP_SNAP_MINUTES) * DROP_SNAP_MINUTES;

  const totalMinutes = (config.slotEndHour - config.slotStartHour) * 60;
  // Lascia spazio ad almeno uno snap di durata nella giornata.
  const clamped = Math.max(0, Math.min(snapped, Math.max(0, totalMinutes - DROP_SNAP_MINUTES)));
  return clamped;
}

/** Calcola l'orario di inizio sul giorno dato i minuti dall'apertura. */
export function buildDropStart(
  day: Date,
  minutesFromStart: number,
  config: WeekSlotConfig
): Date {
  const base = setMinutes(setHours(startOfDay(day), config.slotStartHour), 0);
  return new Date(base.getTime() + minutesFromStart * 60_000);
}

/** Durata da applicare al drop: ore stimate se presenti, altrimenti default. */
export function resolveDropDurationMinutes(estimatedHours?: number | null): number {
  if (estimatedHours != null && Number.isFinite(estimatedHours) && estimatedHours > 0) {
    return Math.round(estimatedHours * 60);
  }
  return DEFAULT_EVENT_DURATION_MINUTES;
}

/**
 * Restituisce fine evento clampata alla chiusura della giornata operativa,
 * così un drop non sfora oltre `slotEndHour` (durata > giornata lavorativa).
 */
export function buildDropEnd(
  day: Date,
  start: Date,
  durationMinutes: number,
  config: WeekSlotConfig
): Date {
  const dayEnd = setMinutes(setHours(startOfDay(day), config.slotEndHour), 0);
  const rawEnd = new Date(start.getTime() + durationMinutes * 60_000);
  return rawEnd > dayEnd ? dayEnd : rawEnd;
}
