"use client";

import { useCallback, useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  buildDropEnd,
  buildDropStart,
  parseDropTarget,
  resolveDropDurationMinutes,
  resolveDropMinutes,
} from "@/lib/calendar-drag";
import type { WeekSlotConfig } from "./useOverlapLayout";
import type { WeeklyCalendarItem } from "../weekly-calendar-types";

interface UseCalendarDndArgs {
  config: WeekSlotConfig;
  /** Mappa dayKey (yyyy-MM-dd) -> Date del giorno. */
  daysByKey: Map<string, Date>;
  /** Drop su uno slot orario: data + ora definite. */
  onReschedule: (item: WeeklyCalendarItem, start: Date, end: Date) => void;
  /** Drop su un giorno senza orario (contenitore "Orario da assegnare"). */
  onAssignDay: (item: WeeklyCalendarItem, day: Date) => void;
  disabled?: boolean;
}

export function useCalendarDnd({
  config,
  daysByKey,
  onReschedule,
  onAssignDay,
  disabled = false,
}: UseCalendarDndArgs) {
  const [activeItem, setActiveItem] = useState<WeeklyCalendarItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor)
  );

  const onDragStart = useCallback((event: DragStartEvent) => {
    const item = event.active.data.current?.item as WeeklyCalendarItem | undefined;
    setActiveItem(item ?? null);
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      if (disabled) return;

      const item = event.active.data.current?.item as
        | WeeklyCalendarItem
        | undefined;
      const over = event.over;
      if (!item || !over) return;

      const target = parseDropTarget(String(over.id));
      if (!target) return;

      const day = daysByKey.get(target.dayKey);
      if (!day) return;

      if (target.kind === "unscheduled") {
        onAssignDay(item, day);
        return;
      }

      // target.kind === "grid": deriva l'ora dalla posizione del bordo
      // superiore della card rilasciata rispetto al top della griglia.
      const translatedTop = event.active.rect.current.translated?.top;
      const gridTop = over.rect.top;
      const minutes = resolveDropMinutes(translatedTop, gridTop, config);

      if (minutes == null) {
        // Fallback (es. tastiera): assegna solo il giorno.
        onAssignDay(item, day);
        return;
      }

      const start = buildDropStart(day, minutes, config);
      const durationMinutes = resolveDropDurationMinutes(item.estimatedHours);
      const end = buildDropEnd(day, start, durationMinutes, config);
      onReschedule(item, start, end);
    },
    [config, daysByKey, disabled, onAssignDay, onReschedule]
  );

  return { sensors, activeItem, onDragStart, onDragEnd };
}
