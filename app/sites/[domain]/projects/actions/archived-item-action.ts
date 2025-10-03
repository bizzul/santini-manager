"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export async function archiveItem(archived: boolean, id: number) {
  const session = await getUserContext();
  let userId = null;
  if (session && session.user && session.user.id) {
    // Use the authId directly from the session
    userId = session.user.id;
  }
  try {
    const supabase = await createClient();
    const { data: archiveTask, error: archiveTaskError } = await supabase
      .from("Task")
      .update({
        archived: archived,
      })
      .eq("id", id)
      .select()
      .single();

    // Create a new Action record to track the user action
    const { data: action, error: actionError } = await supabase
      .from("Action")
      .insert({
        type: "task_update",
        data: {
          task: archiveTask.id,
        },
        user_id: userId,
      });

    return revalidatePath("/projects");
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
