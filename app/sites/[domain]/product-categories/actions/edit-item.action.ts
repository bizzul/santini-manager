"use server";

import { SellProductCategory } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProductCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function editItem(
  formData: Pick<SellProductCategory, "name" | "description" | "color">,
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
      description: data.data.description || null,
      color: data.data.color || "#3B82F6",
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("sellproduct_categories")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      logger.error("Error updating sell product category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

    // Create a new Action record to track the user action
    if (userId) {
      const { error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "sellproduct_category_update",
          data: {
            sellproduct_category_id: id,
          },
          user_id: userId,
        });

      if (actionError) {
        logger.error("Error creating action:", actionError);
      }
    }

    revalidatePath("/product-categories");
    return { success: true };
  } catch (e) {
    logger.error("Error updating sell product category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
