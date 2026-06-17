"use client";

import { useMemo } from "react";
import {
  differenceInMinutes,
  endOfDay,
  format,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import {
  packIntervalsIntoLanes,
  parseDateValue,
} from "../calendar-utils";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";

export interface WeekSlotConfig {
  /** Prima ora visibile della griglia (es. 7). */
  slotStartHour: number;
  /** Ultima ora visibile della griglia (es. 18). */
  slotEndHour: number;
  /** Granularità in minuti usata per posizionamento/altezza (es. 30). */
  slotMinutes: number;
  /** Altezza in px di uno slot da `slotMinutes`. */
  slotHeight: number;
}

export interface LaidOutEvent {
  item: WeeklyCalendarItem;
  /** Inizio "clampato" alla finestra del giorno. */
  start: Date;
  /** Fine "clampata" alla finestra del giorno. */
  end: Date;
  top: number;
  height: number;
  lane: number;
  totalLanes: number;
  clusterId: string;
  isConflict: boolean;
  /** L'evento inizia prima dell'apertura del giorno (multi-giorno). */
  continuesBefore: boolean;
  /** L'evento prosegue oltre la chiusura del giorno (multi-giorno o durata > giornata). */
  continuesAfter: boolean;
}

export interface DayLayout {
  dayKey: string;
  day: Date;
  events: LaidOutEvent[];
  /** Numero massimo di sotto-colonne richieste in giornata. */
  maxLanes: number;
  /** Numero di eventi coinvolti in almeno una sovrapposizione. */
  conflictCount: number;
}

export interface WeekLayout {
  days: DayLayout[];
  byDayKey: Map<string, DayLayout>;
  /** Id (univoci) degli eventi coinvolti in conflitti, sull'intera settimana. */
  conflictItemIds: Set<string>;
}

function isTimedItem(item: WeeklyCalendarItem): boolean {
  return (item.scheduleDisplay ?? "timed") === "timed";
}

export function layoutDayEvents(
  items: WeeklyCalendarItem[],
  day: Date,
  config: WeekSlotConfig
): DayLayout {
  const { slotStartHour, slotEndHour, slotMinutes, slotHeight } = config;
  const dayKey = format(day, "yyyy-MM-dd");
  const dayStart = setMinutes(setHours(startOfDay(day), slotStartHour), 0);
  const dayEnd = setMinutes(setHours(startOfDay(day), slotEndHour), 0);

  const clamped = items
    .filter(isTimedItem)
    .map((item) => {
      const itemStart = parseDateValue(item.startDatetime);
      const itemEnd = parseDateValue(item.endDatetime);
      if (!itemStart || !itemEnd) return null;

      const touchesDay =
        isWithinInterval(itemStart, { start: startOfDay(day), end: endOfDay(day) }) ||
        isWithinInterval(itemEnd, { start: startOfDay(day), end: endOfDay(day) }) ||
        (itemStart < startOfDay(day) && itemEnd > endOfDay(day));
      if (!touchesDay) return null;

      const start = maxDate([itemStart, dayStart]);
      const end = minDate([itemEnd, dayEnd]);
      if (!start || !end || start >= end) return null;

      return {
        id: item.id,
        start,
        end,
        data: {
          item,
          continuesBefore: itemStart < dayStart,
          continuesAfter: itemEnd > dayEnd,
        },
      };
    })
    .filter(
      (
        value
      ): value is {
        id: string;
        start: Date;
        end: Date;
        data: {
          item: WeeklyCalendarItem;
          continuesBefore: boolean;
          continuesAfter: boolean;
        };
      } => Boolean(value)
    );

  const packed = packIntervalsIntoLanes(clamped);

  let maxLanes = 1;
  let conflictCount = 0;

  const events: LaidOutEvent[] = packed.map((entry) => {
    const minutesFromStart = differenceInMinutes(entry.start, dayStart);
    const durationMinutes = Math.max(
      slotMinutes,
      differenceInMinutes(entry.end, entry.start)
    );
    const isConflict = entry.totalLanes > 1;
    if (entry.totalLanes > maxLanes) maxLanes = entry.totalLanes;
    if (isConflict) conflictCount += 1;

    return {
      item: entry.data.item,
      start: entry.start,
      end: entry.end,
      top: (minutesFromStart / slotMinutes) * slotHeight,
      height: Math.max(
        slotHeight,
        (durationMinutes / slotMinutes) * slotHeight - 4
      ),
      lane: entry.lane,
      totalLanes: entry.totalLanes,
      clusterId: entry.clusterId,
      isConflict,
      continuesBefore: entry.data.continuesBefore,
      continuesAfter: entry.data.continuesAfter,
    };
  });

  return { dayKey, day, events, maxLanes, conflictCount };
}

/**
 * Calcola il layout di overlap per ogni giorno della settimana.
 * Memoizzato su (items, giorni, config) per gestire 24+ card senza ricalcoli.
 */
export function useOverlapLayout(
  items: WeeklyCalendarItem[],
  weekDays: Date[],
  config: WeekSlotConfig
): WeekLayout {
  const dayTimestamps = weekDays.map((day) => day.getTime()).join(",");

  return useMemo(() => {
    const days = weekDays.map((day) => layoutDayEvents(items, day, config));
    const byDayKey = new Map<string, DayLayout>();
    const conflictItemIds = new Set<string>();

    days.forEach((dayLayout) => {
      byDayKey.set(dayLayout.dayKey, dayLayout);
      dayLayout.events.forEach((event) => {
        if (event.isConflict) {
          conflictItemIds.add(event.item.id);
        }
      });
    });

    return { days, byDayKey, conflictItemIds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    dayTimestamps,
    config.slotStartHour,
    config.slotEndHour,
    config.slotMinutes,
    config.slotHeight,
  ]);
}
