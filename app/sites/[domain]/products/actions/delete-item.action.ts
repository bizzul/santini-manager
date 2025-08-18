"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";

async function removeProduct(id: number): Promise<any> {
  const supabase = await createClient();
  const { data: sellProduct, error: sellProductError } = await supabase
    .from("sell_product")
    .delete()
    .eq("id", id)
    .select()
    .single();
  if (sellProductError) {
    console.error("Error deleting sell product:", sellProductError);
    throw new Error("Failed to delete sell product");
  }
  return sellProduct;
}

export const removeItem = async (formData: FormData) => {
  //   console.log("formData", formData);
  try {
    await removeProduct(Number(formData));
    return revalidatePath("/products");
  } catch (error) {
    console.error("Error deleting sell product:", error);
    return { message: "Failed to delete" };
  }
};
