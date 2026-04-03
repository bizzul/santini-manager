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
  const [activeView, setActiveView] = useState<"week" | "month" | "table">("table");
  const columns = useMemo(
    () => createColumns(domain, internalActivities, tasks, false),
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
            title="Calendario ore"
            description="Vista settimanale delle ore registrate in sola consultazione."
            emptyStateTitle="Nessuna registrazione ore nella settimana selezionata"
          />
        </TabsContent>

        <TabsContent value="month" className="mt-0">
          <MonthlyCalendarView
            items={calendarItems}
            mode={mode}
            currentUserId={currentUserId}
            title="Calendario ore"
            description="Vista mensile delle ore registrate in sola consultazione."
            emptyStateTitle="Nessuna registrazione ore nel mese selezionato"
            emptyStateDescription="Le registrazioni compariranno qui appena verranno salvate."
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
            readOnly
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataWrapper;
