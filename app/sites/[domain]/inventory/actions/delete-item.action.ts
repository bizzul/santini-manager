"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";

export const removeItem = async (formData: any) => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("product")
      .delete()
      .eq("inventoryId", Number(formData.id));
    if (error) {
      return { message: `Failed to delete item: ${error}` };
    }
    return revalidatePath("/inventory");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
