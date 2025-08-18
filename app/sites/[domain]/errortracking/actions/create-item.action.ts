"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/errorTracking/create";

export async function createItem(props: any) {
  const result = validation.safeParse(props.data);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userId = null;
  if (user) {
    userId = user.id;
  }
  // console.log("result", result.error);
  try {
    if (result.success) {
      const { data: createError, error: createErrorResponse } = await supabase
        .from("errortracking")
        .insert({
          position: result.data.position,
          supplier_id: Number(result.data.supplier!),
          description: result.data.description ?? "",
          error_category: result.data.errorCategory,
          error_type: result.data.errorType!,
          task_id: Number(result.data.task),
          user_id: Number(result.data.user),
        })
        .select()
        .single();

      if (createErrorResponse) {
        console.error("Error creating errortracking:", createErrorResponse);
        return {
          message: "Creazione elemento fallita!",
          error: createErrorResponse.message,
        };
      }

      if (props.filedIds?.length > 0) {
        props.fileIds.forEach(async (file: any) => {
          await supabase.from("file").insert({
            errortracking_id: createError.id,
            name: file.original_filename,
            url: file.secure_url,
            cloudinary_id: file.asset_id,
          });
        });
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
          console.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/errortracking");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
