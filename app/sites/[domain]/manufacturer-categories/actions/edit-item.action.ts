"use server";

import { Manufacturer_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/manufacturerCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

const log = logger.scope("ManufacturerCategoryEdit");

export async function editItem(
  formData: Pick<Manufacturer_category, "name" | "code" | "description">,
  id: number,
) {
  log.debug("editItem called", { formData, id });

  const data = validation.safeParse(formData);

  const supabase = createServiceClient();
  const userContext = await getUserContext();
  let userId = null;

  if (userContext) {
    userId = userContext.user.id;
  }

  if (!data.success) {
    log.warn("Validation failed:", data.error.errors);
    return { error: "Validazione elemento fallita!" };
  }

  try {
    const updateData: any = {
      name: data.data.name,
      code: data.data.code || null,
      description: data.data.description,
    };

    log.debug("Updating manufacturer category:", { id, updateData });

    const { error: updateError } = await supabase
      .from("Manufacturer_category")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      log.error("Error updating manufacturer category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

    log.info("Manufacturer category updated successfully:", id);

    // Create a new Action record to track the user action
    if (userId) {
      const { error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "manufacturer_category_update",
          data: {
            manufacturer_category_id: id,
          },
          user_id: userId,
        });

      if (actionError) {
        log.error("Error creating action:", actionError);
      }
    }

    revalidatePath("/manufacturer-categories");
    return { success: true };
  } catch (e) {
    log.error("Error updating manufacturer category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
