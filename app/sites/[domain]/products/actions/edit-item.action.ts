"use server";

import { SellProduct } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/sellProducts/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function editSellProductAction(
  formData: SellProduct,
  id: number,
  domain?: string,
) {
  const result = validation.safeParse(formData);
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

  if (result.success) {
    try {
      const supabase = await createClient();

      const updateData: any = {
        name: formData.name,
        type: formData.type,
        active: formData.active,
      };

      if (siteId) {
        updateData.site_id = siteId;
      }

      const { data: sellProduct, error: sellProductError } = await supabase
        .from("SellProduct")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (sellProductError) {
        console.error("Error updating sell product:", sellProductError);
        throw new Error("Failed to update sell product");
      }

      // Create a new Action record to track the user action
      if (sellProduct && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "sell_product_update",
            data: {
              sellProductId: sellProduct.id,
            },
            user_id: userId,
          });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/products");
    } catch (error) {
      console.error("Error updating sell product:", error);
      return { error: "Modifica elemento fallita!" };
    }
  }
}
