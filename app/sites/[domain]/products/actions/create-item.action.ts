"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProducts/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function createSellProduct(
  props: any,
  domain?: string,
  siteIdParam?: string,
) {
  const result = validation.safeParse(props);
  const userContext = await getUserContext();
  let userId = null;
  let siteId = siteIdParam || null;

  // Get site information from domain if not provided
  if (!siteId && domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  if (userContext) {
    userId = userContext.user.id;
  }

  if (result.success) {
    const supabase = await createClient();

    // Trova category_id dal nome della categoria
    let categoryId = null;
    if (props.category && siteId) {
      const { data: categoryData } = await supabase
        .from("sellproduct_categories")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", props.category)
        .single();

      if (categoryData) {
        categoryId = categoryData.id;
      }
    }

    const insertData: any = {
      name: props.name,
      type: props.type || null,
      description: props.description || null,
      price_list: props.price_list ?? false,
      image_url: props.image_url || null,
      doc_url: props.doc_url || null,
      category_id: categoryId,
    };

    if (siteId) {
      insertData.site_id = siteId;
    }

    const { data: sellProduct, error: sellProductError } = await supabase
      .from("SellProduct")
      .insert(insertData)
      .select()
      .single();

    if (sellProductError) {
      console.error("Error creating sell product:", sellProductError);
      throw new Error("Failed to create sell product");
    }

    // Create a new Action record to track the user action
    if (sellProduct && userId) {
      const { error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "sell_product_create",
          data: {
            sellProductId: sellProduct.id,
          },
          user_id: userId,
        });

      if (actionError) {
        console.error("Error creating action record:", actionError);
      }
    }

    return { success: true, data: sellProduct };
  } else if (!result.success) {
    return { success: false, error: result.error.format() };
  }
}

export async function createSellProductAction(
  props: any,
  domain?: string,
  siteId?: string,
) {
  try {
    const response = await createSellProduct(props, domain, siteId);
    if (response!.success === true) {
      return revalidatePath("/products");
    }
  } catch (e) {
    return { message: "Creazione elemento fallita!", error: e };
  }
}
