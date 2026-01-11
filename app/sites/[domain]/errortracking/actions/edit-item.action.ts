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
      const updateError = await supabase.from("Errortracking").update({
        where: {
          id,
        },
        data: {
          position: result.data.position,
          supplier_id: Number(result.data.supplier),
          description: result.data.description,
          error_category: result.data.errorCategory,
          error_type: result.data.errorType,
          task_id: Number(result.data.task),
          employee_id: Number(result.data.user),
        },
      });

      // Link new uploaded files to this errortracking record
      if (files?.length > 0) {
        await supabase
          .from("File")
          .update({ errortrackingId: id })
          .in("id", files);
      }

      // Create a new Action record to track the user action
      const action = await supabase.from("action").insert({
        data: {
          type: "errorTracking_update",
          data: {
            errorTrackingId: id,
          },
          user_id: userId,
        },
      });

      return revalidatePath("/errortracking");
    } catch (e) {
      logger.error(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
