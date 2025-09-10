"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

async function removeProduct(id: number, domain?: string): Promise<any> {
  const supabase = await createClient();
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;

  // Get site information
  if (domain) {
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

  // Build delete query with site_id filter if available
  let deleteQuery = supabase
    .from("SellProduct")
    .delete()
    .eq("id", id);

  if (siteId) {
    deleteQuery = deleteQuery.eq("site_id", siteId);
  }

  const { data: sellProduct, error: sellProductError } = await deleteQuery
    .select().single();

  if (sellProductError) {
    console.error("Error deleting sell product:", sellProductError);
    throw new Error("Failed to delete sell product");
  }

  // Create a new Action record to track the user action
  if (sellProduct && userId) {
    const { error: actionError } = await supabase
      .from("Action")
      .insert({
        type: "sell_product_delete",
        data: {
          sellProductId: sellProduct.id,
        },
        user_id: userId,
      });

    if (actionError) {
      console.error("Error creating action record:", actionError);
    }
  }

  return sellProduct;
}

export const removeItem = async (formData: FormData, domain?: string) => {
  try {
    await removeProduct(Number(formData), domain);
    return revalidatePath("/products");
  } catch (error) {
    console.error("Error deleting sell product:", error);
    return { message: "Failed to delete" };
  }
};
