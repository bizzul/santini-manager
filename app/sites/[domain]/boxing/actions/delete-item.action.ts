"use server";

import { createClient } from "@/utils/server";

async function removeProduct(id: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("packing_control")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting packing control:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data };
}

export async function removeItem(id: number) {
  try {
    const response = await removeProduct(id);
    if (response.success === true) {
      return { success: true, data: response.data };
    }
  } catch (e) {
    return { message: "Failed to delete" };
  }
}
