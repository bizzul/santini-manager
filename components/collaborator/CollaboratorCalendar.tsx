"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WeekCalendar } from "@/components/calendar/week/WeekCalendar";
import type { WeeklyCalendarItem } from "@/components/calendar/weekly-calendar-types";

interface CollaboratorCalendarProps {
  items: WeeklyCalendarItem[];
  domain: string;
}

/**
 * Calendario personale del collaboratore: riusa WeekCalendar in sola lettura
 * (niente drag/drop). Mostra solo i progetti pianificati per l'utente loggato.
 */
export function CollaboratorCalendar({ items, domain }: CollaboratorCalendarProps) {
  const router = useRouter();

  const handleItemClick = useCallback(
    (item: WeeklyCalendarItem) => {
      if (item.detailHref) {
        router.push(item.detailHref);
      } else if (item.projectId) {
        router.push(`/sites/${domain}/progetti/${item.projectId}`);
      }
    },
    [domain, router]
  );

  if (items.length === 0) {
    return (
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-semibold">Nessun progetto pianificato per te</p>
            <p className="text-sm text-muted-foreground">
              Le card compariranno qui quando ti verranno assegnati progetti con
              data e orario.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardContent className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <WeekCalendar items={items} readOnly onItemClick={handleItemClick} />
      </CardContent>
    </Card>
  );
}
