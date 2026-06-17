"use client";

import React from "react";
import { CalendarRange, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WeeklyCalendarItem } from "@/components/calendar/weekly-calendar-types";
import type {
  AssignedTaskOption,
  CollaboratorRoleOption,
} from "@/app/sites/[domain]/area-collaboratore/page";
import { CollaboratorCalendar } from "./CollaboratorCalendar";
import { HoursEntryForm } from "./HoursEntryForm";

interface CollaboratorAreaProps {
  domain: string;
  siteId: string;
  userAuthId: string;
  hasProfile: boolean;
  calendarItems: WeeklyCalendarItem[];
  assignedTasks: AssignedTaskOption[];
  roles: CollaboratorRoleOption[];
}

export function CollaboratorArea({
  domain,
  siteId,
  userAuthId,
  hasProfile,
  calendarItems,
  assignedTasks,
  roles,
}: CollaboratorAreaProps) {
  if (!hasProfile) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
        Il tuo profilo collaboratore non è ancora collegato a questo sito.
        Contatta un amministratore per l&apos;abilitazione.
      </div>
    );
  }

  return (
    <Tabs defaultValue="calendar" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="self-start">
        <TabsTrigger value="calendar" className="gap-1.5">
          <CalendarRange className="h-4 w-4" />
          Il mio calendario
        </TabsTrigger>
        <TabsTrigger value="hours" className="gap-1.5">
          <Clock className="h-4 w-4" />
          Inserisci ore
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="calendar"
        className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <CollaboratorCalendar items={calendarItems} domain={domain} />
      </TabsContent>

      <TabsContent value="hours" className="min-h-0 flex-1">
        <HoursEntryForm
          domain={domain}
          siteId={siteId}
          userAuthId={userAuthId}
          assignedTasks={assignedTasks}
          roles={roles}
        />
      </TabsContent>
    </Tabs>
  );
}
