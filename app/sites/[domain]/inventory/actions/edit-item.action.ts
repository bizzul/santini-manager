"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/products/edit";
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
      const totalPrice = formData.unit_price * (formData.quantity || 0);

      const supabase = await createClient();
      
      // Build the update object with all fields
      const updateData: Record<string, any> = {
        product_category_id: formData.productCategoryId,
        name: formData.name,
        supplier_id: formData.supplierId,
        unit_price: formData.unit_price,
        description: formData.description ?? "",
        height: formData.height,
        length: formData.length,
        width: formData.width,
        quantity: formData.quantity,
        total_price: totalPrice,
        type: formData.type,
        unit: formData.unit,
      };

      // Add new inventory fields
      // Category hierarchy
      updateData.category = formData.category || null;
      updateData.category_code = formData.category_code || null;
      updateData.subcategory = formData.subcategory || null;
      updateData.subcategory_code = formData.subcategory_code || null;
      updateData.subcategory2 = formData.subcategory2 || null;
      updateData.subcategory2_code = formData.subcategory2_code || null;
      
      // Color
      updateData.color = formData.color || null;
      updateData.color_code = formData.color_code || null;
      
      // Codes
      updateData.internal_code = formData.internal_code || null;
      updateData.warehouse_number = formData.warehouse_number || null;
      updateData.supplier_code = formData.supplier_code || null;
      
      // Producer
      updateData.producer = formData.producer || null;
      updateData.producer_code = formData.producer_code || null;
      
      // URLs
      updateData.url_tds = formData.url_tds || null;
      updateData.image_url = formData.image_url || null;
      
      // Additional dimensions
      updateData.thickness = formData.thickness || null;
      updateData.diameter = formData.diameter || null;
      
      // Sell price
      updateData.sell_price = formData.sell_price || null;

      const { data: updatedProduct, error: updateError } = await supabase
        .from("Product")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating product:", updateError);
        return { error: "Modifica elemento fallita!" };
      }

      // Create a new Action record to track the user action
      if (updatedProduct && userId) {
        const { error: actionError } = await supabase.from("Action").insert({
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
  } else {
    console.error("Validation errors:", result.error.errors);
    return { error: "Validazione fallita!" };
  }
}
