"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export const removeItem = async (id: number, domain?: string) => {
  try {
    const supabase = await createClient();

    // Get site information and userId
    let siteId = null;
    let organizationId = null;
    let userId = null;

    if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
          organizationId = siteResult.data.organization_id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Get userId from session
    const session = await getUserContext();
    if (session && session.user && session.user.id) {
      // Use the authId directly from the session (Supabase Auth user ID)
      userId = session.user.id;
    }

    // Verify that the task belongs to the current site
    if (siteId) {
      const { data: existingTask, error: taskError } = await supabase
        .from("Task")
        .select("site_id")
        .eq("id", id)
        .single();

      if (taskError || !existingTask) {
        return { error: true, message: "Task non trovato!" };
      }

      if (existingTask.site_id !== siteId) {
        return {
          error: true,
          message: "Non autorizzato a cancellare task di altri siti!",
        };
      }
    }

    // Delete TaskHistory records first
    const { data: taskHistory, error: taskHistoryError } = await supabase
      .from("TaskHistory")
      .select("*")
      .eq("taskId", id);
    if (taskHistory && taskHistory.length > 0) {
      await supabase.from("TaskHistory").delete().eq("taskId", id);
    }

    const { data: qc, error: qcError } = await supabase
      .from("QualityControl")
      .select("*")
      .eq("taskId", id);
    if (qc && qc.length > 0) {
      await supabase.from("QualityControl").delete().eq("taskId", id);
    }

    const { data: boxing, error: boxingError } = await supabase
      .from("PackingControl")
      .select("*")
      .eq("taskId", id);
    if (boxing && boxing.length > 0) {
      await supabase.from("PackingControl").delete().eq("taskId", id);
    }

    // Delete the main task
    const { error: deleteError } = await supabase.from("Task").delete().eq(
      "id",
      id,
    );

    if (deleteError) {
      console.error("Error deleting task:", deleteError);
      return { error: true, message: "Errore nella cancellazione del task!" };
    }

    // Create a new Action record to track the deletion
    if (userId) {
      const actionData: any = {
        type: "task_delete",
        data: {
          task: id,
        },
        user_id: userId, // Use authId directly
      };

      if (siteId) {
        actionData.site_id = siteId;
      }
      if (organizationId) {
        actionData.organization_id = organizationId;
      }

      const { error: actionError } = await supabase
        .from("Action")
        .insert(actionData);

      if (actionError) {
        console.error("Error creating delete action record:", actionError);
      }
    }
    return revalidatePath("/projects");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
