"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { Supplier_category } from "@/types/supabase";
import { logger } from "@/lib/logger";

const log = logger.scope("SupplierCategoryDelete");

export const removeItem = async (formData: Supplier_category) => {
  log.debug("removeItem called", { id: formData.id, name: formData.name });

  try {
    const supabase = createServiceClient();

    log.debug("Deleting supplier category with id:", formData.id);

    const { error } = await supabase
      .from("Supplier_category")
      .delete()
      .eq("id", formData.id);

    if (error) {
      log.error("Error deleting supplier category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    log.info("Supplier category deleted successfully:", formData.id);
    revalidatePath("/supplier-categories");
    return { success: true };
  } catch (e) {
    log.error("Exception deleting supplier category:", e);
    return { message: `Failed to delete item: ${e}` };
  }
};
