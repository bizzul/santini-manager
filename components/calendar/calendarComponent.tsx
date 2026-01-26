"use client";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Task, Kanban } from "@/types/supabase";

export interface KanbanCategory {
  id: number;
  name: string;
  identifier: string;
}

export type TaskWithKanban = Task & {
  Kanban?: Pick<Kanban, "id" | "color" | "title" | "identifier" | "is_production_kanban"> & {
    category?: KanbanCategory | null;
  } | null;
};

export type CalendarType = "production" | "installation" | "service" | "all";

// Helper function to determine if a color is light or dark
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Helper function to check if a kanban matches a calendar type
function matchesCalendarType(
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
  
  switch (type) {
    case "production":
      // Check if kanban is marked as production kanban
      if (kanban.is_production_kanban) return true;
      // Check if kanban category is "produzione"
      if (categoryIdentifier === "produzione" || categoryIdentifier === "production") return true;
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
      // Check category first
      if (categoryIdentifier === "installazione" || categoryIdentifier === "installation") return true;
      // Fallback: check name/identifier patterns
      return (
        name.includes("install") ||
        name.includes("montaggio") ||
        name.includes("cantiere") ||
        name.includes("posa") ||
        identifier === "installation" ||
        identifier === "installazione"
      );
    case "service":
      // Check category first
      if (categoryIdentifier === "service" || categoryIdentifier === "assistenza") return true;
      // Fallback: check name/identifier patterns
      return (
        name.includes("service") ||
        name.includes("assistenza") ||
        name.includes("manutenzione") ||
        identifier === "service"
      );
    default:
      return true;
  }
}

function renderEventContent(eventInfo: any) {
  return (
    <div className="px-2 py-1 truncate text-xs font-medium leading-tight rounded-sm">
      <span>{eventInfo.event.title}</span>
    </div>
  );
}

// Month names for title processing
const MONTH_NAMES = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", 
                     "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

// Calendar type names for display
const CALENDAR_TYPE_NAMES: Record<CalendarType, string> = {
  "production": "Calendario Produzione",
  "installation": "Calendario Posa",
  "service": "Calendario Service",
  "all": "Calendario Produzione",
};

// Fix and format calendar title
function fixCalendarTitle(text: string): string {
  if (!text.trim()) return text;
  
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  
  // Check for duplication pattern - look for two years or two month names
  const yearMatches = trimmed.match(/\d{4}/g);
  const monthCount = MONTH_NAMES.filter(month => lowerText.includes(month)).length;
  
  // If we have multiple years OR multiple months, it's likely a duplication
  const hasDuplication = (yearMatches && yearMatches.length >= 2) || monthCount >= 2;
  
  if (hasDuplication) {
    // Find the last month name in the text (most recent)
    let lastMonthIndex = -1;
    for (const month of MONTH_NAMES) {
      const index = lowerText.lastIndexOf(month);
      if (index > lastMonthIndex) {
        lastMonthIndex = index;
      }
    }
    
    if (lastMonthIndex >= 0) {
      const fromLastMonth = trimmed.substring(lastMonthIndex);
      const yearMatch = fromLastMonth.match(/\d{4}/);
      if (yearMatch) {
        const yearIndex = fromLastMonth.indexOf(yearMatch[0]);
        const endIndex = lastMonthIndex + yearIndex + 4;
        const lastPart = trimmed.substring(lastMonthIndex, endIndex).trim();
        
        return lastPart
          .split(" ")
          .map((word) => {
            const lowerWord = word.toLowerCase();
            if (MONTH_NAMES.includes(lowerWord)) {
              return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
            }
            return word;
          })
          .join(" ");
      }
    }
  }
  
  // No duplication, just ensure proper capitalization
  return trimmed
    .split(" ")
    .map((word) => {
      const lowerWord = word.toLowerCase();
      if (MONTH_NAMES.includes(lowerWord)) {
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
      }
      if (/^\d{4}$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export default function CalendarComponent({
  tasks,
  calendarType = "all",
}: {
  tasks: TaskWithKanban[];
  calendarType?: CalendarType;
}) {
  const [mounted, setMounted] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const calendarRef = useRef<any>(null);
  const [calendarComponents, setCalendarComponents] = useState<{
    FullCalendar: any;
    dayGridPlugin: any;
    itLocale: any;
  } | null>(null);

  // Load calendar components only on client
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [
          { default: FullCalendar },
          { default: dayGridPlugin },
        ] = await Promise.all([
          import("@fullcalendar/react"),
          import("@fullcalendar/daygrid"),
        ]);
        
        // Try to load Italian locale, but don't fail if it doesn't work
        let itLocale = null;
        try {
          const localeModule = await import("@fullcalendar/core/locales/it");
          itLocale = localeModule.default;
        } catch (localeError) {
          console.debug("Italian locale not available, using default");
        }
        
        setCalendarComponents({
          FullCalendar,
          dayGridPlugin,
          itLocale,
        });
        setMounted(true);
      } catch (error) {
        console.error("Error loading calendar components:", error);
        setMounted(true); // Still set mounted to show error state
      }
    };
    
    loadComponents();
  }, []);

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

  // Map over tasks to create events array
  const events = filteredTasks
    .filter((task) => {
      if (!task.unique_code) {
        return false;
      }
      return true;
    })
    .map((task) => {
      const date = new Date(task.deliveryDate!);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      // Get kanban color or use default
      const kanbanColor = task.Kanban?.color || "#1e293b";
      const textColor = getContrastColor(kanbanColor);

      // Build title with code and project name
      const projectName = task.title || task.name;
      const displayTitle = projectName
        ? `${task.unique_code} - ${projectName}`
        : task.unique_code!;

      return {
        title: displayTitle,
        date: `${year}-${month}-${day}`, // Format as YYYY-MM-DD using local date
        backgroundColor: kanbanColor,
        borderColor: kanbanColor,
        textColor: textColor,
        classNames: ["calendar-event"],
      };
    });

  // Custom header format - no title in center since we render our own
  const headerToolbar = {
    left: "prev,next today",
    center: "",
    right: "",
  };

  // Memoize the formatted title
  const displayTitle = useMemo(() => {
    return currentTitle || "";
  }, [currentTitle]);

  // Handle date changes - get proper title from calendar API
  const handleDatesSet = useCallback((dateInfo: any) => {
    // Get the view title directly from FullCalendar's API
    if (dateInfo?.view?.title) {
      const rawTitle = dateInfo.view.title;
      const fixedTitle = fixCalendarTitle(rawTitle);
      setCurrentTitle(fixedTitle);
    }
  }, []);

  // Set initial title on mount
  useEffect(() => {
    if (!mounted || !calendarRef.current) return;
    
    const api = calendarRef.current.getApi?.();
    if (api?.view?.title) {
      const rawTitle = api.view.title;
      const fixedTitle = fixCalendarTitle(rawTitle);
      setCurrentTitle(fixedTitle);
    }
  }, [mounted]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !calendarComponents) {
    return (
      <div className="py-4 z-20 relative w-full">
        <div className="animate-pulse rounded-md h-96 bg-gray-200 dark:bg-white/10" />
      </div>
    );
  }

  const { FullCalendar: FC, dayGridPlugin: plugin, itLocale: locale } = calendarComponents;

  // Calendar props - only include supported FullCalendar props (no key, no className)
  const calendarProps = {
    locale: locale || undefined,
    plugins: [plugin],
    initialView: "dayGridMonth" as const,
    weekends: false,
    eventContent: renderEventContent,
    events: events,
    height: "auto" as const,
    contentHeight: "auto" as const,
    headerToolbar: headerToolbar,
    views: {
      dayGridMonth: {
        titleFormat: { month: "long" as const, year: "numeric" as const },
      },
    },
  };

  return (
    <div className="py-4 z-20 relative w-full">
      <style jsx global>{`
        .fc {
          font-family: inherit;
        }
        .fc-header-toolbar {
          margin-bottom: 1.5rem;
        }
        .fc-toolbar-title {
          /* Hide the original FullCalendar title - we render our own */
          display: none !important;
        }
        .fc-toolbar-title::first-letter {
          text-transform: uppercase !important;
        }
        .fc-button {
          background-color: hsl(var(--background));
          border-color: hsl(var(--input));
          color: hsl(var(--foreground));
          padding: 0.5rem 1rem;
          border-radius: calc(var(--radius) - 2px);
          font-weight: 500;
          transition: all 0.2s;
        }
        .fc-button:hover {
          background-color: hsl(var(--accent));
          border-color: hsl(var(--accent));
        }
        .fc-button:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }
        .fc-button-primary:not(:disabled):active,
        .fc-button-primary:not(:disabled).fc-button-active {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .fc-daygrid-day {
          background-color: hsl(var(--card));
          border-color: hsl(var(--border));
        }
        .fc-daygrid-day-top {
          padding: 0.5rem;
        }
        .fc-daygrid-day-number {
          padding: 0.5rem;
          font-weight: 500;
        }
        .fc-col-header-cell {
          background-color: hsl(var(--muted));
          border-color: hsl(var(--border));
          padding: 0.75rem 0;
        }
        .fc-col-header-cell-cushion {
          font-weight: 600;
          text-transform: capitalize;
          color: hsl(var(--foreground));
        }
        .fc-day-today {
          background-color: hsl(var(--accent) / 0.1);
        }
        .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          font-weight: 700;
          color: hsl(var(--primary));
        }
        .calendar-event {
          border-radius: 4px;
          margin: 2px 0;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }
        .calendar-event:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .fc-event {
          border: none;
          padding: 0;
        }
        .fc-event-main {
          padding: 0;
        }
      `}</style>
      {/* Custom title - controlled by React state to avoid FullCalendar issues */}
      <div className="calendar-custom-title mb-6 text-center">
        <h1 className="text-2xl font-bold mb-1">{CALENDAR_TYPE_NAMES[calendarType]}</h1>
        <p className="text-lg text-muted-foreground">{displayTitle}</p>
      </div>
      <FC 
        ref={calendarRef}
        key="calendar-mounted"
        locale={calendarProps.locale}
        plugins={calendarProps.plugins}
        initialView={calendarProps.initialView}
        weekends={calendarProps.weekends}
        eventContent={calendarProps.eventContent}
        events={calendarProps.events}
        height={calendarProps.height}
        contentHeight={calendarProps.contentHeight}
        headerToolbar={calendarProps.headerToolbar}
        views={calendarProps.views}
        datesSet={handleDatesSet}
      />
    </div>
  );
}
