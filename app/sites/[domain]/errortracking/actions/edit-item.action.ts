"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/errorTracking/create";
import { logger } from "@/lib/logger";

export async function editItem(
  formData: any,
  id: number,
  files: any,
) {
  const supabase = createServiceClient();
  const authClient = await createClient();
  const result = validation.safeParse(formData);
  const {
    data: { user },
  } = await authClient.auth.getUser();
  let userId = null;
  if (user) {
    userId = user.id;
  }

  if (result.success) {
    try {
      const updateData: Record<string, unknown> = {
        supplier_id: result.data.supplier ? Number(result.data.supplier) : null,
        description: result.data.description ?? "",
        error_category: result.data.errorCategory,
        error_type: result.data.errorType ?? "",
        task_id: result.data.task ? Number(result.data.task) : undefined,
        employee_id: result.data.user ? Number(result.data.user) : undefined,
      };
      if (result.data.materialCost != null) updateData.material_cost = result.data.materialCost;
      if (result.data.timeSpentHours != null) updateData.time_spent_hours = result.data.timeSpentHours;
      if (result.data.transferKm != null) updateData.transfer_km = result.data.transferKm;
      const { error: updateError } = await supabase
        .from("Errortracking")
        .update(updateData)
        .eq("id", id);

      if (updateError) {
        logger.error("Error updating errortracking:", updateError);
        return { error: updateError.message };
      }

      // Link new uploaded files to this errortracking record
      if (files?.length > 0) {
        await supabase
          .from("File")
          .update({ errortrackingId: id })
          .in("id", files);
      }

      // Create a new Action record to track the user action
      if (userId) {
        const { error: actionError } = await supabase.from("Action").insert({
          type: "errorTracking_update",
          data: {
            errorTrackingId: id,
          },
          user_id: userId,
        });

        if (actionError) {
          logger.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/errortracking");
    } catch (e) {
      logger.error(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
