"use server";

import { Product_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/productsCategory/create";
import { getUserContext } from "@/lib/auth-utils";

export async function editItem(
  formData: Pick<Product_category, "name" | "description">,
  id: number,
) {
  const data = validation.safeParse(formData);

  const supabase = await createClient();
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
  }

  if (!data.success) {
    console.log("Validation failed");
    return { error: "Validazione elemento fallita!" };
  }

  try {
    const { data: result, error: updateError } = await supabase
      .from("product_category")
      .update({
        name: data.data.name,
        description: data.data.description,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

    // Create a new Action record to track the user action
    const { error: actionError } = await supabase
      .from("action")
      .insert({
        type: "product_category_update",
        data: {
          product_category: id,
        },
        user_id: userId,
      });

    if (actionError) {
      console.error("Error creating action:", actionError);
      return { error: "Modifica elemento fallita!" };
    }

    revalidatePath("/categories");
    console.log("Path revalidated, returning success");
    return { success: true };
  } catch (e) {
    console.error("Error updating category:", e);
    return { error: "Modifica elemento fallita!" };
  }
}
