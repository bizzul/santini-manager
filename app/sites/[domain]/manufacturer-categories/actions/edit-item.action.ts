"use server";

import { Manufacturer_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/manufacturerCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function editItem(
  formData: Pick<Manufacturer_category, "name" | "code" | "description">,
  id: number,
) {
  const data = validation.safeParse(formData);

  const supabase = await createClient();
  const userContext = await getUserContext();
  let userId = null;

  if (userContext) {
    userId = userContext.user.id;
  }

  if (!data.success) {
    logger.debug("Validation failed");
    return { error: "Validazione elemento fallita!" };
  }

  try {
    const updateData: any = {
      name: data.data.name,
      code: data.data.code || null,
      description: data.data.description,
    };

    const { error: updateError } = await supabase
      .from("Manufacturer_category")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      logger.error("Error updating manufacturer category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

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
        console.error("Error creating action:", actionError);
      }
    }

    revalidatePath("/manufacturer-categories");
    return { success: true };
  } catch (e) {
    logger.error("Error updating manufacturer category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
