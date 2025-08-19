"use server";

import { Product_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/productsCategory/create";
import { getUserContext } from "@/lib/auth-utils";

export async function createItem(
  props: Pick<Product_category, "name" | "description">,
) {
  const result = validation.safeParse(props);
  const supabase = await createClient();
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
  }

  if (!result.success) {
    return { message: "Validazione elemento fallita!" };
  }

  try {
    const { data, error } = await supabase
      .from("product_category")
      .insert({
        name: props.name,
        description: props.description,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }

    if (data && userId) {
      // Create a new Action record to track the user action
      const { error: actionError } = await supabase
        .from("action")
        .insert({
          type: "product_category_create",
          data: {
            category_id: data.id,
          },
          user_id: userId,
        });

      if (actionError) {
        console.error("Error creating action record:", actionError);
      }
    }

    revalidatePath("/categories");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error creating categories:", error);
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
