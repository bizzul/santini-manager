"use client";
import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Task, Kanban } from "@/types/supabase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyCalendarView } from "./MonthlyCalendarView";
import { WeeklyCalendarView } from "./WeeklyCalendarView";
import {
  buildProjectCalendarItems,
  type ProjectCalendarType,
} from "./calendar-utils";

export interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
}

export type TaskWithKanban = Task & {
  Kanban?: Pick<Kanban, "id" | "color" | "title" | "identifier" | "is_production_kanban"> & {
    category?: KanbanCategory | null;
  } | null;
  Client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  column?: {
    title?: string | null;
    identifier?: string | null;
  } | null;
  SellProduct?: {
    id?: number;
    name?: string | null;
    type?: string | null;
    category?: { id?: number; name?: string | null; color?: string | null } | null;
  } | null;
};

export type CalendarType = "production" | "installation" | "service" | "all";

// Helper function to check if a kanban matches a calendar type (exported for CalendarTimeView)
export function matchesCalendarType(
  kanban: TaskWithKanban["Kanban"],
  type: CalendarType
): boolean {
  if (type === "all") return true;
  if (!kanban) {
    // If no kanban, allow it for production calendar (fallback)
    return type === "production";
  }

  const name = (kanban.title || kanban.identifier || "").toLowerCase();
  const identifier = (kanban.identifier || "").toLowerCase();
  const categoryIdentifier = (kanban.category?.identifier || "").toLowerCase();
  const categoryName = ((kanban.category as any)?.name || "").toLowerCase();
  
  switch (type) {
    case "production":
      // Check if kanban is marked as production kanban
      if (kanban.is_production_kanban) return true;
      // Check if kanban category is "produzione"
      if (categoryIdentifier === "produzione" || categoryIdentifier === "production") return true;
      if (categoryName.includes("produzione") || categoryName.includes("production")) return true;
      // Fallback: check name/identifier patterns
      return (
        name.includes("produzione") ||
        name.includes("prod") ||
        name.includes("officina") ||
        name.includes("lavorazione") ||
        identifier === "production" ||
        identifier === "produzione"
      );
    case "installation":
      // Check category first (identifier or name)
      if (categoryIdentifier === "installazione" || categoryIdentifier === "installation" || categoryIdentifier === "posa") return true;
      if (categoryName.includes("installazione") || categoryName.includes("installation") || categoryName.includes("posa")) return true;
      // Fallback: check kanban name/identifier patterns
      return (
        name.includes("install") ||
        name.includes("montaggio") ||
        name.includes("cantiere") ||
        name.includes("posa") ||
        identifier === "installation" ||
        identifier === "installazione" ||
        identifier === "posa"
      );
    case "service":
      // Check category first (identifier or name)
      if (categoryIdentifier === "service" || categoryIdentifier === "assistenza") return true;
      if (categoryName.includes("service") || categoryName.includes("assistenza")) return true;
      // Fallback: check kanban name/identifier patterns
      return (
        name.includes("service") ||
        name.includes("assistenza") ||
        name.includes("manutenzione") ||
        identifier === "service" ||
        identifier === "assistenza"
      );
    default:
      return true;
  }
}

// Calendar type names for display
const CALENDAR_TYPE_NAMES: Record<CalendarType, string> = {
  "production": "Calendario Produzione",
  "installation": "Calendario Posa",
  "service": "Calendario Service",
  "all": "Calendario Produzione",
};

export default function CalendarComponent({
  tasks,
  calendarType = "all",
  domain,
}: {
  tasks: TaskWithKanban[];
  calendarType?: CalendarType;
  domain?: string;
}) {
  const params = useParams();
  const domainFromPath = params?.domain as string | undefined;
  const effectiveDomain = domain ?? domainFromPath;
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Filter tasks by calendar type and delivery date
  const filteredTasks = tasks.filter((task) => {
    // Must have delivery date
    if (!task.deliveryDate) {
      return false;
    }
    
    // If calendarType is "all", show all tasks
    if (calendarType === "all") {
      return true;
    }
    
    // Must match calendar type
    const matches = matchesCalendarType(task.Kanban, calendarType);
    return matches;
  });
  const displayCalendarType: ProjectCalendarType =
    calendarType === "all" ? "production" : calendarType;
  const isProductionCalendar = displayCalendarType === "production";

  const weeklyItems = useMemo(() => {
    if (!effectiveDomain) {
      return [];
    }
    return buildProjectCalendarItems(filteredTasks, effectiveDomain, displayCalendarType);
  }, [displayCalendarType, effectiveDomain, filteredTasks]);

  return (
    <div className="py-4 z-20 relative w-full">
      <div className="mb-4 flex justify-center">
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "week" | "month")}
        >
          <TabsList>
            <TabsTrigger value="week">Settimana operativa</TabsTrigger>
            <TabsTrigger value="month">Mese</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "week" ? (
        <WeeklyCalendarView
          items={weeklyItems}
          mode="admin"
          title={`${CALENDAR_TYPE_NAMES[calendarType]} - Settimana`}
          description={
            isProductionCalendar
              ? "Planner operativo per tenere sotto controllo le scadenze giornaliere di produzione."
              : "Planner operativo con card progetto stile Kanban e segnalazione per gli orari ancora da definire."
          }
          slotStartHour={6}
          slotEndHour={19}
          slotMinutes={60}
          visibleWeekDays={7}
          weeksToShow={2}
          showFiltersBar={false}
          emptyStateTitle="Nessun progetto in settimana"
          emptyStateDescription={
            isProductionCalendar
              ? "Le card compariranno qui appena i progetti avranno una data di completamento."
              : "Le card compariranno qui appena i progetti avranno data o fascia oraria."
          }
        />
      ) : (
        <MonthlyCalendarView
          items={weeklyItems}
          mode="admin"
          calendarType={displayCalendarType}
          title={`${CALENDAR_TYPE_NAMES[calendarType]} - Mese`}
          description={
            isProductionCalendar
              ? "Vista mensile a scadenza: per la produzione conta il giorno entro cui completare il progetto."
              : "Vista mensile con card stile planner settimanale e campanello sui progetti senza orario."
          }
          emptyStateTitle="Nessun progetto nel mese"
          emptyStateDescription={
            isProductionCalendar
              ? "Le card compariranno qui appena i progetti avranno una data entro cui completarsi."
              : "Le card compariranno qui appena i progetti avranno una data pianificata."
          }
        />
      )}
    </div>
  );
}
