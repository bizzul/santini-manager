"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/products/create";
import { getUserContext } from "@/lib/auth-utils";
export async function editItem(formData: any, id: number) {
  const result = validation.safeParse(formData);
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
  }

  if (result.success) {
    try {
      const totalPrice = formData.unit_price * formData.quantity;

      const supabase = await createClient();
      const { data: updatedProduct, error: updateError } = await supabase
        .from("product")
        .update({
          product_category_id: formData.productCategoryId,
          name: formData.name,
          supplier_id: formData.supplierId,
          unit_price: formData.unit_price,
          description: formData.description,
          height: formData.height,
          length: formData.length,
          width: formData.width,
          quantity: formData.quantity,
          total_price: totalPrice,
          type: formData.type,
          unit: formData.unit,
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating product:", updateError);
        return { error: "Modifica elemento fallita!" };
      }

      // Create a new Action record to track the user action
      if (updatedProduct && userId) {
        const { error: actionError } = await supabase.from("action").insert({
          type: "product_update",
          data: {
            inventoryId: updatedProduct.id,
          },
          user_id: userId,
        });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/inventory");
    } catch (e) {
      console.log(e);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
