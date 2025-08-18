"use server";

import { validation } from "@/validation/sellProducts/create";

import { createClient } from "@/utils/server";

export async function createSellProduct(props: any) {
  const result = validation.safeParse(props);

  if (result.success) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("packing_control")
      .insert({
        name: props.name,
        type: props.type,
      })
      .select();
    return { success: true, data: data };
  }
  return { success: false, error: result.error.format() };
}

export async function createSellProductAction(props: any) {
  //console.log("props", props);
  try {
    const response = await createSellProduct(props);
    if (response.success === true) {
      return { success: true, data: response.data };
    }
  } catch (e) {
    return { message: "Creazione elemento fallita!", error: e };
  }
}
