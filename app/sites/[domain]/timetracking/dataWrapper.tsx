"use client";

import React, { useMemo } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Timetracking, User, Roles, Task } from "@/types/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TableProperties } from "lucide-react";
import { WeeklyCalendarView } from "@/components/calendar/WeeklyCalendarView";
import { buildTimetrackingCalendarItems } from "@/components/calendar/calendar-utils";
import type { WeeklyCalendarTimetrackingEntry } from "@/components/calendar/weekly-calendar-types";

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
  const columns = useMemo(() => createColumns(domain, internalActivities), [domain, internalActivities]);
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
      <Tabs defaultValue="week" className="space-y-4">
        <TabsList>
          <TabsTrigger value="week" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendario ore
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

        <TabsContent value="table" className="mt-0">
          <DataTable
            columns={columns}
            data={data}
            users={users}
            roles={roles}
            tasks={tasks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataWrapper;
