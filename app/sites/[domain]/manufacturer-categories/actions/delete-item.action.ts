"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { Manufacturer_category } from "@/types/supabase";

export const removeItem = async (formData: Manufacturer_category) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Manufacturer_category")
      .delete()
      .eq("id", formData.id);

    if (error) {
      console.error("Error deleting manufacturer category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    revalidatePath("/manufacturer-categories");
    return { success: true };
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
