"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getSiteData } from "@/lib/fetchers";

// Main function to save state and handle revalidation
export async function saveState(domain?: string) {
  try {
    const supabase = await createClient();
    const result = await saveKanbanState(supabase, domain);
    if (result.success) {
      revalidatePath("/kanban");
      return { success: true };
    }
    return { success: false, error: result.reason };
  } catch (error) {
    console.error("Error saving state:", error);
    return { success: false, error: "Failed to save state" };
  }
}

// Internal function to handle the actual saving of state
async function saveKanbanState(supabase: any, domain?: string) {
  try {
    let siteId = null;

    // Get site information
    if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Get all current tasks with their column and kanban information (filter by site_id if available)
    let tasksQuery = supabase
      .from("Task")
      .select("*");

    if (siteId) {
      tasksQuery = tasksQuery.eq("site_id", siteId);
    }

    const { data: currentTasks, error: currentTasksError } = await tasksQuery;

    if (currentTasksError) {
      console.error("Error fetching current tasks:", currentTasksError);
      throw new Error("Failed to fetch current tasks");
    }

    // Get the latest snapshot timestamp
    const { data: latestSnapshot, error: latestSnapshotError } = await supabase
      .from("TaskHistory")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(1);

    // Increase the cooldown to 5 minutes (300000 ms)
    if (
      !latestSnapshot ||
      Date.now() - latestSnapshot[0].createdAt.getTime() > 300000
    ) {
      // Create history entries for all tasks, including column and position data
      const historyPromises = currentTasks.map((task: any) => {
        const snapshotData = {
          ...task,
          kanbanColumnId: task.kanbanColumnId,
          kanbanId: task.kanbanId,
          column_position: task.column_position,
          column: {
            id: task.column?.id,
            title: task.column?.title,
            identifier: task.column?.identifier,
            position: task.column?.position,
          },
          kanban: {
            id: task.kanban?.id,
            title: task.kanban?.title,
            identifier: task.kanban?.identifier,
          },
        };

        return supabase
          .from("TaskHistory")
          .insert({
            taskId: task.id,
            snapshot: snapshotData,
          })
          .select()
          .single();
      });

      await Promise.all(historyPromises);
      return { success: true };
    }
    return { success: false, reason: "Too soon since last snapshot" };
  } catch (error) {
    console.error("Error saving kanban state:", error);
    throw error;
  }
}
