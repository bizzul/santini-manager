"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { Supplier_category } from "@/types/supabase";

export const removeItem = async (formData: Supplier_category) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("Supplier_category")
      .delete()
      .eq("id", formData.id);

    if (error) {
      console.error("Error deleting supplier category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    revalidatePath("/supplier-categories");
    return { success: true };
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
