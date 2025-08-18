"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";

export async function archiveItem(archived: boolean, id: number) {
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
  }
  try {
    const supabase = await createClient();
    const { data: archiveTask, error: archiveTaskError } = await supabase
      .from("task")
      .update({
        archived: archived,
      })
      .eq("id", id)
      .select()
      .single();

    // Create a new Action record to track the user action
    await supabase.from("action").insert({
      type: "task_update",
      data: {
        task: archiveTask.id,
      },
      user_id: userId,
    });

    return revalidatePath("/kanban");
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
