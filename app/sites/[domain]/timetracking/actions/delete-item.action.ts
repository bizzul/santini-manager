"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { Timetracking } from "@/types/supabase";

export const removeItem = async (formData: Timetracking) => {
  try {
    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from("timetracking")
      .delete()
      .eq("id", Number(formData.id));

    if (deleteError) {
      console.error("Error deleting timetracking:", deleteError);
      return { message: `Failed to delete item: ${deleteError.message}` };
    }

    return revalidatePath("/timetracking");
  } catch (e) {
    console.error("Error deleting timetracking:", e);
    return { message: `Failed to delete item: ${e}` };
  }
};
