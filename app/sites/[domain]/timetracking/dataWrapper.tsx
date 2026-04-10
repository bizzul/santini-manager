"use client";

import React, { useMemo, useState } from "react";
import { DataTable } from "./table";
import { createColumns } from "./columns";
import { Timetracking, User, Roles, Task } from "@/types/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, CalendarDays, Plus, TableProperties } from "lucide-react";
import { MonthlyCalendarView } from "@/components/calendar/MonthlyCalendarView";
import { WeeklyCalendarView } from "@/components/calendar/WeeklyCalendarView";
import { buildTimetrackingCalendarItems } from "@/components/calendar/calendar-utils";
import CreateProductForm from "./createForm";
import { useRouter } from "next/navigation";

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const router = useRouter();
  const isEditableTable = mode === "admin";
  const columns = useMemo(
    () => createColumns(domain, internalActivities, tasks, isEditableTable),
    [domain, internalActivities, isEditableTable, tasks]
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

          {mode === "admin" && (
            <div className="flex flex-col items-start gap-1 md:items-end">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 md:ml-auto">
                    <Plus className="h-4 w-4" />
                    Aggiungi ore retroattive
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nuovo report ore collaboratore</DialogTitle>
                    <DialogDescription>
                      Inserisci ore anche su date passate per i collaboratori del sito.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateProductForm
                    key={String(isCreateDialogOpen)}
                    data={tasks}
                    users={users}
                    roles={roles}
                    internalActivities={internalActivities}
                    handleClose={() => {
                      setIsCreateDialogOpen(false);
                      router.refresh();
                    }}
                  />
                </DialogContent>
              </Dialog>
              <p className="text-xs text-muted-foreground">Solo admin/superadmin</p>
            </div>
          )}
        </div>
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
            readOnly={!isEditableTable}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataWrapper;
