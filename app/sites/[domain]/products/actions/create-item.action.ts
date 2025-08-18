"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProducts/create";

export async function createSellProduct(props: any) {
  const result = validation.safeParse(props);

  if (result.success) {
    const supabase = await createClient();
    const { data: sellProduct, error: sellProductError } = await supabase
      .from("sell_product")
      .insert({
        name: props.name,
        type: props.type,
      })
      .select()
      .single();
    if (sellProductError) {
      console.error("Error creating sell product:", sellProductError);
      throw new Error("Failed to create sell product");
    }
    return { success: true, data: sellProduct };
  } else if (!result.success) {
    return { success: false, error: result.error.format() };
  }
}

export async function createSellProductAction(props: any) {
  //console.log("props", props);
  try {
    const response = await createSellProduct(props);
    if (response!.success === true) {
      return revalidatePath("/products");
    }
  } catch (e) {
    return { message: "Creazione elemento fallita!", error: e };
  }
}
