"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProducts/create";
export async function editSellProductAction(formData: any, id: number) {
  const result = validation.safeParse(formData);
  if (result.success) {
    try {
      const supabase = await createClient();
      await supabase
        .from("quality_control")
        .update({
          name: formData.name,
          type: formData.type,
        })
        .eq("id", id);
      return revalidatePath("/qualityControl");
    } catch (e) {
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
