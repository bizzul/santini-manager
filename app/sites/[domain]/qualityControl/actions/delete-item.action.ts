"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";

async function removeProduct(id: number): Promise<any> {
  const supabase = await createClient();
  const { data: qc, error: qcError } = await supabase
    .from("quality_control")
    .delete()
    .eq("id", id);

  if (qcError) {
    console.error("Error deleting quality control:", qcError);
    return { message: "Failed to delete" };
  }

  return qc;
}

export const removeItem = async (formData: FormData) => {
  //   console.log("formData", formData);
  try {
    await removeProduct(Number(formData));
    return revalidatePath("/qualityControl");
  } catch (e) {
    return { message: "Failed to create" };
  }
};
