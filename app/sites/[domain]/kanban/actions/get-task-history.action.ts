"use server";
import { createClient } from "@/utils/server";

export async function getTaskHistory(taskId: number) {
  const supabase = await createClient();
  const { data: taskHistory, error: taskHistoryError } = await supabase
    .from("task_history")
    .select("*")
    .eq("taskId", taskId)
    .order("createdAt", { ascending: false });
  if (taskHistoryError) {
    console.error("Error fetching task history:", taskHistoryError);
    throw new Error("Failed to fetch task history");
  }
  return taskHistory;
}
