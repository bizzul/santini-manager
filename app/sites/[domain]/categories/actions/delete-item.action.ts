"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { Product_category } from "@/types/supabase";

export const removeItem = async (formData: Product_category) => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Product_category")
      .delete()
      .eq("id", formData.id);

    if (error) {
      console.error("Error deleting category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    revalidatePath("/categories");
    return { success: true };
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
