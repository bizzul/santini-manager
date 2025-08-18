"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/products/create";
import { getUserContext } from "@/lib/auth-utils";

export async function createItem(props: any) {
  const result = validation.safeParse(props);
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
  }

  if (result.success) {
    try {
      const totalPrice = props.unit_price * props.quantity;
      const supabase = await createClient();
      const { data: newProduct, error: createError } = await supabase
        .from("product")
        .insert({
          product_category_id: props.productCategoryId,
          name: props.name,
          supplier_id: props.supplierId,
          unit_price: props.unit_price,
          description: props.description ?? "",
          height: props.height,
          length: props.length,
          width: props.width,
          quantity: props.quantity,
          total_price: totalPrice,
          type: props.type,
          unit: props.unit,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating product:", createError);
        return {
          message: "Creazione elemento fallita!",
          error: createError.message,
        };
      }

      // Create a new Action record to track the user action
      if (newProduct && userId) {
        const { error: actionError } = await supabase.from("action").insert({
          type: "product_create",
          data: {
            inventoryId: newProduct.id,
          },
          user_id: userId,
          productId: newProduct.id,
        });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/inventory");
    } catch (error: any) {
      console.error("Error creating product:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
