"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/errorTracking/create";

export async function editItem(
  formData: any,
  id: number,
  files: any,
) {
  const supabase = await createClient();
  const result = validation.safeParse(formData);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userId = null;
  if (user) {
    userId = user.id;
  }

  if (result.success) {
    try {
      const updateError = await supabase.from("errortracking").update({
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

      files.forEach(async (file: any) => {
        const fileUpdate = await supabase.from("file").update({
          where: {
            id: file.id,
          },
          data: {
            name: file.original_filename,
            url: file.secure_url,
            cloudinaryId: file.asset_id,
          },
        });
      });

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
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
