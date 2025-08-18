"use server";

import { validation } from "@/validation/sellProducts/create";
import { createClient } from "@/utils/server";

export async function editSellProductAction(formData: any, id: number) {
  const result = validation.safeParse(formData);
  if (result.success) {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("packing_control")
        .update({
          name: formData.name,
          type: formData.type,
        })
        .eq("id", id)
        .select();
      return { success: true, data: data };
    } catch (e) {
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
