"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";

export const removeItem = async (formData: any) => {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("Errortracking")
      .delete()
      .eq("id", Number(formData.id));
    if (error) {
      return { message: `Failed to delete item: ${error}` };
    }
    revalidatePath("/errortracking");
    return { success: true };
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
