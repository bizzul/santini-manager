"use client";
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Task, Kanban } from "@/types/supabase";
import itLocale from "@fullcalendar/core/locales/it";

export type TaskWithKanban = Task & {
  Kanban?: Pick<Kanban, "id" | "color" | "title"> | null;
};

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

function renderEventContent(eventInfo: any) {
  return (
    <div className="px-1 py-0.5 truncate">
      <span className="font-medium">{eventInfo.event.title}</span>
    </div>
  );
}

export default function CalendarComponent({
  tasks,
}: {
  tasks: TaskWithKanban[];
}) {
  const tasksWithDeliveryDate = tasks.filter(
    (task) => task.deliveryDate !== undefined && task.deliveryDate !== null
  );

  // Map over tasks to create events array
  const events = tasksWithDeliveryDate.map((task) => {
    const date = new Date(task.deliveryDate!);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Get kanban color or use default
    const kanbanColor = task.Kanban?.color || "#1e293b";
    const textColor = getContrastColor(kanbanColor);

    return {
      title: task.unique_code!,
      date: `${year}-${month}-${day}`, // Format as YYYY-MM-DD using local date
      backgroundColor: kanbanColor,
      borderColor: kanbanColor,
      textColor: textColor,
    };
  });

  return (
    <div className="py-4 z-20 relative w-full">
      <FullCalendar
        locale={itLocale}
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        weekends={false}
        eventContent={renderEventContent}
        events={events}
        height="auto"
        contentHeight="auto"
        dayHeaderClassNames={"black text-black"}
      />
    </div>
  );
}
