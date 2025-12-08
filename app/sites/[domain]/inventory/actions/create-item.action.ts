"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/products/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContextFromDomain } from "@/lib/site-context";

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props);
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;
  
  if (userContext) {
    userId = userContext.user.id;
  }

  // Get site_id from domain
  if (domain) {
    const context = await getSiteContextFromDomain(domain);
    siteId = context.siteId;
  }

  if (result.success) {
    try {
      const totalPrice = props.unit_price * props.quantity;
      const supabase = await createClient();
      
      // Build the product object with all fields
      const productData: Record<string, any> = {
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
      };

      // Add site_id if available
      if (siteId) {
        productData.site_id = siteId;
      }

      // Add new inventory fields if provided
      if (props.category) productData.category = props.category;
      if (props.category_code) productData.category_code = props.category_code;
      if (props.subcategory) productData.subcategory = props.subcategory;
      if (props.subcategory_code) productData.subcategory_code = props.subcategory_code;
      if (props.subcategory2) productData.subcategory2 = props.subcategory2;
      if (props.subcategory2_code) productData.subcategory2_code = props.subcategory2_code;
      if (props.color) productData.color = props.color;
      if (props.color_code) productData.color_code = props.color_code;
      if (props.internal_code) productData.internal_code = props.internal_code;
      if (props.warehouse_number) productData.warehouse_number = props.warehouse_number;
      if (props.supplier_code) productData.supplier_code = props.supplier_code;
      if (props.producer) productData.producer = props.producer;
      if (props.producer_code) productData.producer_code = props.producer_code;
      if (props.url_tds) productData.url_tds = props.url_tds;
      if (props.image_url) productData.image_url = props.image_url;
      if (props.thickness) productData.thickness = props.thickness;
      if (props.diameter) productData.diameter = props.diameter;
      if (props.sell_price) productData.sell_price = props.sell_price;

      const { data: newProduct, error: createError } = await supabase
        .from("Product")
        .insert(productData)
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
      // Use productId column so fetchInventoryData can find it
      if (newProduct && userId) {
        const { error: actionError } = await supabase.from("Action").insert({
          type: "product_create",
          productId: newProduct.id,
          user_id: userId,
          data: {},
        });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/inventory");
    } catch (error: any) {
      console.error("Error creating product:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    console.error("Validation errors:", result.error.errors);
    return { message: "Validazione elemento fallita!", errors: result.error.errors };
  }
}
