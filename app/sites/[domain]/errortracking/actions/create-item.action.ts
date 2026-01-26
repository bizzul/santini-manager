"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/errorTracking/create";
import { logger } from "@/lib/logger";

export async function createItem(props: any) {
  const result = validation.safeParse(props.data);
  const supabase = createServiceClient();
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  let userId = null;
  if (user) {
    userId = user.id;
  }
  // console.log("result", result.error);
  try {
    if (result.success) {
      const { data: createError, error: createErrorResponse } = await supabase
        .from("Errortracking")
        .insert({
          supplier_id: result.data.supplier ? Number(result.data.supplier) : null,
          description: result.data.description ?? "",
          error_category: result.data.errorCategory,
          error_type: result.data.errorType ?? "",
          task_id: Number(result.data.task),
          user_id: Number(result.data.user),
        })
        .select()
        .single();

      if (createErrorResponse) {
        logger.error("Error creating errortracking:", createErrorResponse);
        return {
          message: "Creazione elemento fallita!",
          error: createErrorResponse.message,
        };
      }

      // Link uploaded files to this errortracking record
      if (props.fileIds?.length > 0) {
        await supabase
          .from("File")
          .update({ errortrackingId: createError.id })
          .in("id", props.fileIds);
      }

      // Create a new Action record to track the user action
      if (createError && userId) {
        const { error: actionError } = await supabase.from("action").insert({
          type: "errorTracking_create",
          data: {
            errorTracking: createError.id,
          },
          user_id: userId,
        });

        if (actionError) {
          logger.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/errortracking");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    logger.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
