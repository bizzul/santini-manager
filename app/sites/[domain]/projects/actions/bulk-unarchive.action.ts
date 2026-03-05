"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";

export async function bulkUnarchive(ids: number[]) {
  const session = await getUserContext();
  let userId = null;
  if (session && session.user && session.user.id) {
    userId = session.user.id;
  }

  if (!ids || ids.length === 0) {
    return { message: "Nessun elemento selezionato" };
  }

  try {
    const supabase = await createClient();

    const { data: updatedTasks, error } = await supabase
      .from("Task")
      .update({
        archived: false,
        auto_archive_at: null,
      })
      .in("id", ids)
      .select();

    if (error) {
      console.error("Error unarchiving tasks:", error);
      return { message: "Errore durante la disarchiviazione", error: error.message };
    }

    // Log the action
    if (userId && updatedTasks) {
      await supabase.from("Action").insert(
        updatedTasks.map((task) => ({
          type: "task_update",
          data: {
            task: task.id,
            action: "bulk_unarchive",
          },
          user_id: userId,
        }))
      );
    }

    revalidatePath("/projects");
    return { success: true, count: updatedTasks?.length || 0 };
  } catch (error: any) {
    console.error("Error in bulk unarchive:", error);
    return { message: "Operazione fallita!", error: error.message };
  }
}
