"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { Manufacturer_category } from "@/types/supabase";
import { logger } from "@/lib/logger";

const log = logger.scope("ManufacturerCategoryDelete");

export const removeItem = async (formData: Manufacturer_category) => {
  log.debug("removeItem called", { id: formData.id, name: formData.name });

  try {
    const supabase = createServiceClient();

    log.debug("Deleting manufacturer category with id:", formData.id);

    const { error } = await supabase
      .from("Manufacturer_category")
      .delete()
      .eq("id", formData.id);

    if (error) {
      log.error("Error deleting manufacturer category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    log.info("Manufacturer category deleted successfully:", formData.id);
    revalidatePath("/manufacturer-categories");
    return { success: true };
  } catch (e) {
    log.error("Exception deleting manufacturer category:", e);
    return { message: `Failed to delete item: ${e}` };
  }
};
