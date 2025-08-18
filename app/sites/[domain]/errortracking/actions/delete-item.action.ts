"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";

export const removeItem = async (formData: any) => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("errortracking")
      .delete()
      .eq("id", Number(formData.id));
    if (error) {
      return { message: `Failed to delete item: ${error}` };
    }
    return revalidatePath("/errortracking");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
