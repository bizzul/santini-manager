"use server";

import { SellProduct } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProducts/create";
export async function editSellProductAction(formData: SellProduct, id: number) {
  const result = validation.safeParse(formData);
  if (result.success) {
    try {
      const supabase = await createClient();
      const { data: sellProduct, error: sellProductError } = await supabase
        .from("sell_product")
        .update({
          name: formData.name,
          type: formData.type,
          active: formData.active,
        })
        .eq("id", id)
        .select()
        .single();
      if (sellProductError) {
        console.error("Error updating sell product:", sellProductError);
        throw new Error("Failed to update sell product");
      }
      return revalidatePath("/products");
    } catch (error) {
      console.error("Error updating sell product:", error);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
