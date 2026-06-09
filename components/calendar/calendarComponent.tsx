"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Task, Kanban } from "@/types/supabase";
import { CalendarProjectEditDialog } from "./CalendarProjectEditDialog";
import { ProjectSchedulerCalendar } from "./ProjectSchedulerCalendar";
import {
  buildProjectCalendarItems,
  getCalendarPagePath,
  taskHasScheduleForCalendarType,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainFromPath = params?.domain as string | undefined;
  const effectiveDomain = domain ?? domainFromPath;
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const editTaskId = searchParams.get("edit");

  const filteredTasks = tasks.filter((task) => {
    const displayType: ProjectCalendarType =
      calendarType === "all" ? "production" : calendarType;

    if (!taskHasScheduleForCalendarType(task, displayType)) {
      return false;
    }

    if (calendarType === "all") {
      return true;
    }

    return matchesCalendarType(task.Kanban, calendarType);
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

  const taskToEdit = useMemo(() => {
    if (!editTaskId) {
      return null;
    }

    const id = Number.parseInt(editTaskId, 10);
    if (Number.isNaN(id)) {
      return null;
    }

    return tasks.find((task) => task.id === id) ?? null;
  }, [editTaskId, tasks]);

  const closeProjectEdit = useCallback(() => {
    if (!effectiveDomain) {
      return;
    }

    const path = getCalendarPagePath(displayCalendarType, effectiveDomain);
    router.replace(path, { scroll: false });
    router.refresh();
  }, [displayCalendarType, effectiveDomain, router]);

  useEffect(() => {
    if (!editTaskId || taskToEdit || !effectiveDomain) {
      return;
    }

    const path = getCalendarPagePath(displayCalendarType, effectiveDomain);
    router.replace(path, { scroll: false });
  }, [displayCalendarType, editTaskId, effectiveDomain, router, taskToEdit]);

  return (
    <div
      className={
        viewMode === "week"
          ? "relative z-20 flex h-full min-h-0 w-full flex-col"
          : "relative z-20 w-full py-4"
      }
    >
      {effectiveDomain && (
        <ProjectSchedulerCalendar
          items={weeklyItems}
          calendarType={displayCalendarType}
          domain={effectiveDomain}
          view={viewMode}
          onViewChange={setViewMode}
          title={`${CALENDAR_TYPE_NAMES[calendarType]} - ${viewMode === "week" ? "Settimana" : "Mese"}`}
          description={
            isProductionCalendar
              ? viewMode === "week"
                ? "Planner operativo con card progetto trascinabili e ridimensionabili."
                : "Vista mensile con finestre di produzione su più giorni."
              : viewMode === "week"
                ? "Planner operativo con card progetto trascinabili e ridimensionabili."
                : "Vista mensile con card progetto e segnalazione per gli orari ancora da definire."
          }
          emptyStateTitle={
            viewMode === "week" ? "Nessun progetto in settimana" : "Nessun progetto nel mese"
          }
          emptyStateDescription={
            isProductionCalendar
              ? "Le card compariranno qui appena i progetti avranno una finestra di produzione."
              : "Le card compariranno qui appena i progetti avranno data e fascia oraria."
          }
        />
      )}
      {effectiveDomain && taskToEdit && (
        <CalendarProjectEditDialog
          task={taskToEdit}
          open={Boolean(editTaskId)}
          onClose={closeProjectEdit}
          domain={effectiveDomain}
        />
      )}
    </div>
  );
}
