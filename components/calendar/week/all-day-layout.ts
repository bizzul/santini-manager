import type { WeeklyCalendarItem } from "../weekly-calendar-types";

export interface AllDaySegment {
  item: WeeklyCalendarItem;
  /** Indice (0-based) della prima colonna-giorno visibile coperta. */
  startIndex: number;
  /** Indice (0-based, incluso) dell'ultima colonna-giorno visibile coperta. */
  endIndex: number;
  /** Riga della fascia (0-based). */
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  /** `yyyy-MM-dd` del primo giorno visibile, per "g X di N". */
  firstVisibleDayKey: string;
}

export function isAllDayItem(item: WeeklyCalendarItem): boolean {
  return Boolean(item.allDay && item.startDate && item.endDate);
}

export function isMultiDayItem(item: WeeklyCalendarItem): boolean {
  return isAllDayItem(item) && (item.durationDays ?? 1) > 1;
}

/**
 * Taglia gli eventi all-day sui giorni visibili e li impila in righe
 * (greedy: prima riga libera). `dayKeys` sono `yyyy-MM-dd` ordinati.
 */
export function layoutAllDaySegments(
  items: WeeklyCalendarItem[],
  dayKeys: string[]
): { segments: AllDaySegment[]; laneCount: number } {
  if (dayKeys.length === 0) return { segments: [], laneCount: 0 };
  const firstKey = dayKeys[0];
  const lastKey = dayKeys[dayKeys.length - 1];

  const candidates = items
    .filter(isAllDayItem)
    .filter((item) => item.startDate! <= lastKey && item.endDate! >= firstKey)
    .map((item) => {
      const startKey = item.startDate! < firstKey ? firstKey : item.startDate!;
      const endKey = item.endDate! > lastKey ? lastKey : item.endDate!;
      return {
        item,
        startIndex: dayKeys.indexOf(startKey),
        endIndex: dayKeys.indexOf(endKey),
        continuesBefore: item.startDate! < firstKey,
        continuesAfter: item.endDate! > lastKey,
        firstVisibleDayKey: startKey,
      };
    })
    .filter((entry) => entry.startIndex >= 0 && entry.endIndex >= entry.startIndex)
    .sort(
      (left, right) =>
        left.startIndex - right.startIndex ||
        right.endIndex - right.startIndex - (left.endIndex - left.startIndex) ||
        String(left.item.projectNumber || "").localeCompare(String(right.item.projectNumber || ""), "it")
    );

  const laneEnds: number[] = [];
  const segments: AllDaySegment[] = candidates.map((entry) => {
    let lane = laneEnds.findIndex((end) => end < entry.startIndex);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.endIndex);
    } else {
      laneEnds[lane] = entry.endIndex;
    }
    return { ...entry, lane };
  });

  return { segments, laneCount: laneEnds.length };
}
