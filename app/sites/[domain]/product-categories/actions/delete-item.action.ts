"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { SellProductCategory } from "@/types/supabase";

export const removeItem = async (formData: SellProductCategory) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sellproduct_categories")
      .delete()
      .eq("id", formData.id);

    if (error) {
      console.error("Error deleting sell product category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    revalidatePath("/product-categories");
    return { success: true };
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
