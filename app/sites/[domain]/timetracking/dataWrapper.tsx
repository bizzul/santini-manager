"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Timetracking, User, Roles, Task } from "@/types/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarDays, TableProperties } from "lucide-react";
import { MonthlyCalendarView } from "@/components/calendar/MonthlyCalendarView";
import { WeeklyCalendarView } from "@/components/calendar/WeeklyCalendarView";
import { buildTimetrackingCalendarItems } from "@/components/calendar/calendar-utils";
import type { WeeklyCalendarTimetrackingEntry } from "@/components/calendar/weekly-calendar-types";
import { TimetrackingInstructionsCard } from "@/components/timeTracking/timetracking-instructions";

interface InternalActivity {
  id: string;
  code: string;
  label: string;
  site_id: string | null;
  sort_order: number;
}

interface DataWrapperProps {
  data: Timetracking[];
  users: User[];
  roles: Roles[];
  tasks: Task[];
  domain?: string;
  internalActivities?: InternalActivity[];
  mode?: "personal" | "admin";
  currentUserId?: string;
}

const DataWrapper = ({
  data,
  users,
  roles,
  tasks,
  domain,
  internalActivities = [],
  mode = "admin",
  currentUserId,
}: DataWrapperProps) => {
  const [activeView, setActiveView] = useState<"week" | "month" | "table">("week");
  const columns = useMemo(
    () => createColumns(domain, internalActivities, tasks, mode === "admin"),
    [domain, internalActivities, mode, tasks]
  );
  const activityLabels = useMemo(
    () => new Map(internalActivities.map((activity) => [activity.code, activity.label])),
    [internalActivities]
  );
  const calendarItems = useMemo(
    () => buildTimetrackingCalendarItems(data as any[], domain || "", activityLabels),
    [activityLabels, data, domain]
  );
  
  return (
    <div className="container mx-auto ">
      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as "week" | "month" | "table")}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="week" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendario ore
          </TabsTrigger>
          <TabsTrigger value="month" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Mese
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <TableProperties className="h-4 w-4" />
            Tabella
          </TabsTrigger>
        </TabsList>

        <TimetrackingInstructionsCard
          view={activeView}
          mode={mode}
          entryCount={data.length}
          userCount={users.length}
        />

        <TabsContent value="week" className="mt-0">
          <WeeklyCalendarView
            items={calendarItems}
            mode={mode}
            currentUserId={currentUserId}
            slotStartHour={7}
            slotEndHour={17}
            targetConfig={
              mode === "personal"
                ? { weekdayMinutes: 540, fridayMinutes: 360 }
                : undefined
            }
            timetrackingEditConfig={
              mode === "admin"
                ? {
                    entries: data as WeeklyCalendarTimetrackingEntry[],
                    users,
                    roles,
                    tasks,
                  }
                : undefined
            }
            title="Calendario ore"
            description="Vista settimanale delle ore registrate con filtri, conflitti, riepiloghi e modifica rapida per gli amministratori."
            emptyStateTitle="Nessuna registrazione ore nella settimana selezionata"
          />
        </TabsContent>

        <TabsContent value="month" className="mt-0">
          <MonthlyCalendarView
            items={calendarItems}
            mode={mode}
            currentUserId={currentUserId}
            title="Calendario ore"
            description="Vista mensile delle ore registrate con filtri, riepilogo per giorno e accesso rapido alla modifica."
            emptyStateTitle="Nessuna registrazione ore nel mese selezionato"
            emptyStateDescription="Le registrazioni compariranno qui appena ci saranno ore pianificate o consuntivate."
            timetrackingEditConfig={
              mode === "admin"
                ? {
                    entries: data as WeeklyCalendarTimetrackingEntry[],
                    users,
                    roles,
                    tasks,
                  }
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="table" className="mt-0">
          <DataTable
            columns={columns}
            data={data}
            users={users}
            roles={roles}
            tasks={tasks}
            domain={domain}
            internalActivities={internalActivities}
            mode={mode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataWrapper;
