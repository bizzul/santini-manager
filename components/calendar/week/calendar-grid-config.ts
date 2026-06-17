import type { WeekSlotConfig } from "./useOverlapLayout";

/** Configurazione condivisa della griglia oraria settimanale (07:00–18:00). */
export const SLOT_START_HOUR = 7;
export const SLOT_END_HOUR = 18;
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT = 28;
export const TIME_COL_WIDTH = 56;

export const WEEK_SLOT_CONFIG: WeekSlotConfig = {
  slotStartHour: SLOT_START_HOUR,
  slotEndHour: SLOT_END_HOUR,
  slotMinutes: SLOT_MINUTES,
  slotHeight: SLOT_HEIGHT,
};

export const GRID_HEIGHT =
  ((SLOT_END_HOUR - SLOT_START_HOUR) * 60 * SLOT_HEIGHT) / SLOT_MINUTES;

export function buildHourLabels(): Array<{ hour: number; top: number }> {
  const labels: Array<{ hour: number; top: number }> = [];
  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour += 1) {
    labels.push({
      hour,
      top: ((hour - SLOT_START_HOUR) * 60 * SLOT_HEIGHT) / SLOT_MINUTES,
    });
  }
  return labels;
}
