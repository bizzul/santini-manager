"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProducts/create";

export async function createSellProduct(props: any) {
  const result = validation.safeParse(props);

  if (result.success) {
    const supabase = await createClient();
    const { data: sellProduct, error: sellProductError } = await supabase
      .from("quality_control")
      .insert({
        name: props.name,
        type: props.type,
      });

    if (sellProductError) {
      console.error("Error creating quality control:", sellProductError);
      return { message: "Failed to create" };
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
      return revalidatePath("/qualityControl");
    }
  } catch (e) {
    return { message: "Creazione elemento fallita!", error: e };
  }
}
