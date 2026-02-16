"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/errorTracking/create";
import { logger } from "@/lib/logger";
import { getUserContext } from "@/lib/auth-utils";
export async function createItem(props: any, domain?: string) {
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

  // Get the current user's database ID
  const userContext = await getUserContext();
  if (!userContext) {
    return { error: true, message: "Utente non autenticato!" };
  }

  try {
    if (result.success) {
      const insertData: Record<string, unknown> = {
        supplier_id: result.data.supplier
          ? Number(result.data.supplier)
          : null,
        description: result.data.description ?? "",
        error_category: result.data.errorCategory,
        error_type: result.data.errorType ?? "",
        task_id: Number(result.data.task),
        user_id: userContext.userId,
      };
      if (result.data.materialCost != null) {
        insertData.material_cost = result.data.materialCost;
      }
      if (result.data.timeSpentHours != null) {
        insertData.time_spent_hours = result.data.timeSpentHours;
      }
      if (result.data.transferKm != null) {
        insertData.transfer_km = result.data.transferKm;
      }
      const { data: createError, error: createErrorResponse } = await supabase
        .from("Errortracking")
        .insert(insertData)
        .select()
        .single();

      if (createErrorResponse) {
        logger.error("Error creating errortracking:", createErrorResponse);
        return {
          error: true,
          message: createErrorResponse.message || "Creazione elemento fallita!",
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

      if (domain) {
        revalidatePath(`/sites/${domain}/errortracking`);
      } else {
        revalidatePath("/errortracking");
      }
      return createError;
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    logger.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
