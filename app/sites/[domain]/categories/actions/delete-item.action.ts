"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { Product_category } from "@prisma/client";

export const removeItem = async (formData: Product_category) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_category")
      .delete()
      .eq("id", formData.id);

    if (error) {
      console.error("Error deleting category:", error);
      return {
        message: "Eliminazione elemento fallita!",
        error: error.message,
      };
    }

    if (data) {
      return revalidatePath("/categories");
    }

    return revalidatePath("/categories");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
