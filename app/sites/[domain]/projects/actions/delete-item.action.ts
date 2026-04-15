"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

const DELETE_BATCH_SIZE = 200;
const MAX_BATCH_LOOPS = 200;

async function deleteTaskHistoryInBatches(supabase: any, taskId: number) {
  let loopCount = 0;

  while (loopCount < MAX_BATCH_LOOPS) {
    let historyBatchQuery: any = supabase
      .from("TaskHistory")
      .select("id")
      .eq("taskId", taskId);
    if (typeof historyBatchQuery.order === "function") {
      historyBatchQuery = historyBatchQuery.order("id", { ascending: true });
    }
    if (typeof historyBatchQuery.limit === "function") {
      historyBatchQuery = historyBatchQuery.limit(DELETE_BATCH_SIZE);
    }
    const { data: historyBatch, error: historyBatchError } = await historyBatchQuery;

    if (historyBatchError) {
      return {
        error: true,
        message: `Errore nel recupero storico task: ${historyBatchError.message}`,
      };
    }

    if (!historyBatch || historyBatch.length === 0) {
      return { error: false };
    }

    const batchIds = historyBatch.map((item: { id: number }) => item.id);
    const { error: batchDeleteError } = await supabase
      .from("TaskHistory")
      .delete()
      .in("id", batchIds);

    if (batchDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione storico task: ${batchDeleteError.message}`,
      };
    }

    loopCount += 1;
  }

  return {
    error: true,
    message:
      "Errore nella cancellazione storico task: raggiunto limite massimo di batch.",
  };
}

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

    // Delete related entities before deleting Task (order matters for FK constraints)
    const { data: packingControls, error: packingControlsError } = await supabase
      .from("PackingControl")
      .select("id")
      .eq("taskId", id);
    if (packingControlsError) {
      return {
        error: true,
        message: `Errore nel recupero packing controls: ${packingControlsError.message}`,
      };
    }
    const packingControlIds = (packingControls || []).map((item) => item.id);
    if (packingControlIds.length > 0) {
      const { error: packingItemsDeleteError } = await supabase
        .from("PackingItem")
        .delete()
        .in("packingControlId", packingControlIds);
      if (packingItemsDeleteError) {
        return {
          error: true,
          message: `Errore nella cancellazione packing items: ${packingItemsDeleteError.message}`,
        };
      }
    }

    const { data: qualityControls, error: qualityControlsError } = await supabase
      .from("QualityControl")
      .select("id")
      .eq("taskId", id);
    if (qualityControlsError) {
      return {
        error: true,
        message: `Errore nel recupero quality controls: ${qualityControlsError.message}`,
      };
    }
    const qualityControlIds = (qualityControls || []).map((item) => item.id);
    if (qualityControlIds.length > 0) {
      const { error: qcItemsDeleteError } = await supabase
        .from("Qc_item")
        .delete()
        .in("qualityControlId", qualityControlIds);
      if (qcItemsDeleteError) {
        return {
          error: true,
          message: `Errore nella cancellazione QC items: ${qcItemsDeleteError.message}`,
        };
      }
    }

    const { error: timetrackingDeleteError } = await supabase
      .from("Timetracking")
      .delete()
      .eq("task_id", id);
    if (timetrackingDeleteError) {
      return { error: true, message: "Errore nella cancellazione del task!" };
    }

    const taskHistoryDeleteResult = await deleteTaskHistoryInBatches(supabase, id);
    if (taskHistoryDeleteResult.error) {
      return taskHistoryDeleteResult;
    }

    const { error: taskSupplierDeleteError } = await supabase
      .from("TaskSupplier")
      .delete()
      .eq("taskId", id);
    if (taskSupplierDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione fornitori task: ${taskSupplierDeleteError.message}`,
      };
    }

    const { error: filesDeleteError } = await supabase
      .from("File")
      .delete()
      .eq("taskId", id);
    if (filesDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione file task: ${filesDeleteError.message}`,
      };
    }

    const { error: actionDeleteError } = await supabase
      .from("Action")
      .delete()
      .eq("taskId", id);
    if (actionDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione azioni task: ${actionDeleteError.message}`,
      };
    }

    const { error: errorTrackingDeleteError } = await supabase
      .from("Errortracking")
      .delete()
      .eq("task_id", id);
    if (errorTrackingDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione error tracking: ${errorTrackingDeleteError.message}`,
      };
    }

    const { error: qcDeleteError } = await supabase
      .from("QualityControl")
      .delete()
      .eq("taskId", id);
    if (qcDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione quality controls: ${qcDeleteError.message}`,
      };
    }

    const { error: packingDeleteError } = await supabase
      .from("PackingControl")
      .delete()
      .eq("taskId", id);
    if (packingDeleteError) {
      return {
        error: true,
        message: `Errore nella cancellazione packing controls: ${packingDeleteError.message}`,
      };
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
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    return { error: true, message: `Failed to delete item: ${e}` };
  }
};
