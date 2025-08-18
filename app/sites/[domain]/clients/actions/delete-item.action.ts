"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";

export const removeItem = async (formData: any) => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("client")
      .delete()
      .eq("id", Number(formData.id));

    if (error) {
      return { message: `Failed to delete item: ${error.message}` };
    }
    return revalidatePath("/clients");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
