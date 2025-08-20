"use client";
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Task } from "@/types/supabase";
import itLocale from "@fullcalendar/core/locales/it";

function renderEventContent(eventInfo: any) {
  return (
    <>
      <b>{eventInfo.timeText}</b>
      <i>{eventInfo.event.title}</i>
    </>
  );
}

export default function CalendarComponent({ tasks }: { tasks: Task[] }) {
  const tasksWithDeliveryDate = tasks.filter(
    (task) => task.deliveryDate !== undefined && task.deliveryDate !== null
  );

  // Map over tasks to create events array
  const events = tasksWithDeliveryDate.map((task) => {
    const date = new Date(task.deliveryDate!);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return {
      title: task.unique_code!,
      date: `${year}-${month}-${day}`, // Format as YYYY-MM-DD using local date
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
