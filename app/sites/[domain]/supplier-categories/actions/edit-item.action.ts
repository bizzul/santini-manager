"use server";

import { Supplier_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/supplierCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";

const log = logger.scope("SupplierCategoryEdit");

export async function editItem(
  formData: Pick<Supplier_category, "name" | "code" | "description">,
  id: number,
) {
  log.debug("editItem called", { formData, id });

  const data = validation.safeParse(formData);

  const supabase = createServiceClient();
  const userContext = await getUserContext();
  let userId = null;

  if (userContext) {
    userId = userContext.user.id;
    log.debug("User ID:", userId);
  } else {
    log.warn("No user context found");
  }

  if (!data.success) {
    log.warn("Validation failed:", data.error.errors);
    return { error: "Validazione elemento fallita!" };
  }

  log.debug("Validation passed");

  try {
    const updateData: any = {
      name: data.data.name,
      code: data.data.code || null,
      description: data.data.description,
    };

    log.debug("Updating supplier category:", { id, updateData });

    const { error: updateError } = await supabase
      .from("Supplier_category")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      log.error("Error updating supplier category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

    log.info("Supplier category updated successfully:", id);

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
        log.error("Error creating action:", actionError);
      } else {
        log.debug("Action record created");
      }
    }

    revalidatePath("/supplier-categories");
    log.debug("Path revalidated, returning success");
    return { success: true };
  } catch (e) {
    log.error("Error updating supplier category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
