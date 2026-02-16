import React from "react";
import { Task, Kanban } from "@/types/supabase";
import CalendarTimeView from "@/components/calendar/CalendarTimeView";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { requireServerSiteContext } from "@/lib/server-data";

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

async function getData(siteId: string): Promise<TaskWithKanban[]> {
  // Fetch data from your API here.
  const supabase = await createClient();
  
  // First, fetch tasks with delivery dates
  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("*, SellProduct:sellProductId(id, name, type, category:sellproduct_categories(id, name, color))")
    .eq("site_id", siteId)
    .eq("archived", false)
    .not("deliveryDate", "is", null);
  
  if (tasksError) {
    console.error("Error fetching tasks for calendar:", tasksError);
    return [];
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  // Get unique kanban IDs
  const kanbanIds = Array.from(new Set(tasks.map(t => t.kanbanId || t.kanban_id).filter(Boolean)));
  
  // Fetch kanbans separately (including category for proper filtering)
  let kanbansMap: Record<number, any> = {};
  if (kanbanIds.length > 0) {
    const { data: kanbans, error: kanbansError } = await supabase
      .from("Kanban")
      .select("id, color, title, identifier, is_production_kanban, category_id, category:KanbanCategory!category_id(id, name, identifier)")
      .in("id", kanbanIds);
    
    if (!kanbansError && kanbans) {
      kanbansMap = kanbans.reduce((acc, k) => {
        acc[k.id] = k;
        return acc;
      }, {} as Record<number, any>);
    }
  }

  // Combine tasks with kanbans
  const tasksWithKanbans: TaskWithKanban[] = tasks.map(task => {
    const kanbanId = task.kanbanId || task.kanban_id;
    return {
      ...task,
      Kanban: kanbanId ? kanbansMap[kanbanId] || null : null,
    };
  });

  return tasksWithKanbans;
}

async function Page({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const resolvedParams = await params;
  const domain = resolvedParams.domain;

  const userContext = await getUserContext();

  if (!userContext || !userContext.user) {
    // Handle the absence of a session. Redirect or return an error.
    // For example, you might redirect to the login page:
    return redirect("/login");
  }

  // Get site context (required for multi-tenant)
  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  //get initial data filtered by siteId
  const data = await getData(siteId);

  return (
    <div className="container w-full mx-auto relative ">
      <CalendarTimeView tasks={data as TaskWithKanban[]} calendarType="service" domain={domain} />
    </div>
  );
}

export default Page;
