"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";

export const removeItem = async (id: number) => {
  try {
    // Delete TaskHistory records first
    const supabase = await createClient();
    const { data: taskHistory, error: taskHistoryError } = await supabase
      .from("task_history")
      .select("*")
      .eq("taskId", id);
    if (taskHistory && taskHistory.length > 0) {
      await supabase.from("task_history").delete().eq("taskId", id);
    }

    const { data: qc, error: qcError } = await supabase
      .from("quality_control")
      .select("*")
      .eq("taskId", id);
    if (qc && qc.length > 0) {
      await supabase.from("quality_control").delete().eq("taskId", id);
    }

    const { data: boxing, error: boxingError } = await supabase
      .from("packing_control")
      .select("*")
      .eq("taskId", id);
    if (boxing && boxing.length > 0) {
      await supabase.from("packing_control").delete().eq("taskId", id);
    }
    await supabase.from("task").delete().eq("id", id);
    return revalidatePath("/projects");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
