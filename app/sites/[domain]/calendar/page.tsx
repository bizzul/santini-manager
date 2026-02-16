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
};

async function getData(siteId: string): Promise<TaskWithKanban[]> {
  // Fetch data from your API here.
  const supabase = await createClient();
  
  // For production calendar, we need tasks from production kanbans
  // First get all kanbans that are in the "produzione" category or marked as production
  const { data: productionKanbans, error: kanbanError } = await supabase
    .from("Kanban")
    .select("id, color, title, identifier, is_production_kanban, category_id, category:KanbanCategory!category_id(id, name, identifier)")
    .eq("site_id", siteId);
  
  if (kanbanError) {
    console.error("Error fetching kanbans for calendar:", kanbanError);
    return [];
  }

  // Filter to get only production kanbans
  const productionKanbanIds = (productionKanbans || [])
    .filter(k => {
      const categoryIdentifier = (k.category as any)?.identifier?.toLowerCase() || "";
      const kanbanIdentifier = (k.identifier || "").toLowerCase();
      const kanbanTitle = (k.title || "").toLowerCase();
      
      return (
        k.is_production_kanban === true ||
        categoryIdentifier === "produzione" ||
        categoryIdentifier === "production" ||
        kanbanTitle.includes("produzione") ||
        kanbanTitle.includes("prod") ||
        kanbanTitle.includes("officina") ||
        kanbanTitle.includes("lavorazione") ||
        kanbanIdentifier === "production" ||
        kanbanIdentifier === "produzione"
      );
    })
    .map(k => k.id);

  console.log("[Calendar Production] Found production kanbans:", productionKanbanIds.length, productionKanbans?.map(k => ({ id: k.id, title: k.title, category: (k.category as any)?.identifier, is_production: k.is_production_kanban })));

  if (productionKanbanIds.length === 0) {
    console.log("[Calendar Production] No production kanbans found");
    return [];
  }

  // Create kanbans map
  const kanbansMap: Record<number, any> = {};
  productionKanbans?.forEach(k => {
    kanbansMap[k.id] = k;
  });

  // Fetch tasks from production kanbans that have a delivery date or termine_produzione
  // For production calendar, we use deliveryDate OR termine_produzione
  // Include SellProduct with category for colors/icons per product type
  const { data: tasks, error: tasksError } = await supabase
    .from("Task")
    .select("*, SellProduct:sellProductId(id, name, type, category:sellproduct_categories(id, name, color))")
    .eq("site_id", siteId)
    .eq("archived", false)
    .in("kanbanId", productionKanbanIds);
  
  if (tasksError) {
    console.error("Error fetching tasks for calendar:", tasksError);
    return [];
  }

  // Filter tasks that have either deliveryDate or termine_produzione
  const tasksWithDate = (tasks || []).filter(t => t.deliveryDate || t.termine_produzione);
  
  console.log("[Calendar Production] Total tasks in production kanbans:", tasks?.length);
  console.log("[Calendar Production] Tasks with date (deliveryDate or termine_produzione):", tasksWithDate.length);

  if (tasksWithDate.length === 0) {
    // Also try with kanban_id field (alternative column name)
    const { data: tasksAlt, error: tasksAltError } = await supabase
      .from("Task")
      .select("*, SellProduct:sellProductId(id, name, type, category:sellproduct_categories(id, name, color))")
      .eq("site_id", siteId)
      .eq("archived", false)
      .in("kanban_id", productionKanbanIds);
    
    if (tasksAltError) {
      console.error("Error fetching tasks (alt) for calendar:", tasksAltError);
      return [];
    }
    
    const tasksAltWithDate = (tasksAlt || []).filter(t => t.deliveryDate || t.termine_produzione);
    console.log("[Calendar Production] Tasks (alt) with date:", tasksAltWithDate.length);
    
    if (tasksAltWithDate.length === 0) {
      return [];
    }
    
    // For tasks using termine_produzione, copy it to deliveryDate for calendar display
    return tasksAltWithDate.map(task => ({
      ...task,
      deliveryDate: task.deliveryDate || task.termine_produzione,
      Kanban: kanbansMap[task.kanban_id] || null,
    }));
  }
  
  // For tasks using termine_produzione, copy it to deliveryDate for calendar display
  const tasksNormalized = tasksWithDate.map(task => ({
    ...task,
    deliveryDate: task.deliveryDate || task.termine_produzione,
  }));

  // Combine tasks with kanbans
  const tasksWithKanbans: TaskWithKanban[] = tasksNormalized.map(task => {
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
      {/* Tasks are already filtered server-side for production kanbans, use "all" to avoid double filtering */}
      <CalendarComponent tasks={data as TaskWithKanban[]} calendarType="all" domain={domain} />
    </div>
  );
}

export default Page;
