import React from "react";
import { Task, Kanban } from "@/types/supabase";
import CalendarComponent from "@/components/calendar/calendarComponent";
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
  Client?: {
    businessName?: string | null;
    individualFirstName?: string | null;
    individualLastName?: string | null;
  } | null;
  column?: {
    title?: string | null;
    identifier?: string | null;
  } | null;
  projectCollaborators?: Array<{
    id?: string | number | null;
    authId?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    initials?: string | null;
    picture?: string | null;
  }>;
};

async function getData(siteId: string): Promise<TaskWithKanban[]> {
  const supabase = await createClient();
  
  // Fetch tasks with delivery dates
  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("*, SellProduct:sellProductId(id, name, type, category:sellproduct_categories(id, name, color)), Client:clientId(businessName, individualFirstName, individualLastName), column:KanbanColumn!kanbanColumnId(title, identifier)")
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
  // Use left join (no !) so kanbans without category are still included
  let kanbansMap: Record<number, any> = {};
  if (kanbanIds.length > 0) {
    const { data: kanbans, error: kanbansError } = await supabase
      .from("Kanban")
      .select("id, color, title, identifier, is_production_kanban, category_id, category:KanbanCategory(id, name, identifier)")
      .in("id", kanbanIds);
    
    if (!kanbansError && kanbans) {
      kanbansMap = kanbans.reduce((acc, k) => {
        acc[k.id] = k;
        return acc;
      }, {} as Record<number, any>);
    }
  }

  const taskIds = tasks.map((task) => task.id).filter((value): value is number => Boolean(value));
  const collaboratorsByTask = new Map<number, TaskWithKanban["projectCollaborators"]>();
  if (taskIds.length > 0) {
    const { data: timetrackingUsers } = await supabase
      .from("Timetracking")
      .select(
        "task_id, user:employee_id(id, authId, given_name, family_name, initials, picture)"
      )
      .eq("site_id", siteId)
      .in("task_id", taskIds);

    (timetrackingUsers || []).forEach((entry: any) => {
      const taskId = Number(entry.task_id);
      if (!taskId || !entry.user) return;
      const users = collaboratorsByTask.get(taskId) || [];
      const userId = entry.user.authId || entry.user.id;
      if (!userId) return;
      const alreadyPresent = users.some(
        (user: any) => String(user.authId || user.id) === String(userId)
      );
      if (alreadyPresent) return;
      users.push(entry.user);
      collaboratorsByTask.set(taskId, users);
    });
  }

  // Combine tasks with kanbans
  const tasksWithKanbans: TaskWithKanban[] = tasks.map(task => {
    const kanbanId = task.kanbanId || task.kanban_id;
    return {
      ...task,
      Kanban: kanbanId ? kanbansMap[kanbanId] || null : null,
      projectCollaborators: collaboratorsByTask.get(task.id) || [],
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
    return redirect("/login");
  }

  // Get site context (required for multi-tenant)
  const siteContext = await requireServerSiteContext(domain);
  const { siteId } = siteContext;

  const data = await getData(siteId);

  return (
    <div className="container w-full mx-auto relative">
      <CalendarComponent tasks={data as TaskWithKanban[]} calendarType="installation" domain={domain} />
    </div>
  );
}

export default Page;
