"use server";

import { Supplier_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/supplierCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

export async function editItem(
  formData: Pick<Supplier_category, "name" | "code" | "description">,
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
      .from("Supplier_category")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating supplier category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

    // Create a new Action record to track the user action
    if (userId) {
      const { error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "supplier_category_update",
          data: {
            supplier_category_id: id,
          },
          user_id: userId,
        });

      if (actionError) {
        logger.error("Error creating action:", actionError);
      }
    }

    revalidatePath("/supplier-categories");
    return { success: true };
  } catch (e) {
    logger.error("Error updating supplier category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
