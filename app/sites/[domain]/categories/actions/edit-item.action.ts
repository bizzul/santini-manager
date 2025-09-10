"use server";

import { Product_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/productsCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function editItem(
  formData: Pick<Product_category, "name" | "description">,
  id: number,
  domain?: string,
) {
  const data = validation.safeParse(formData);

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
    // Use the authId directly as it's a string and matches Action.user_id type
    userId = userContext.user.id;
  }

  if (!data.success) {
    console.log("Validation failed");
    return { error: "Validazione elemento fallita!" };
  }

  try {
    const updateData: any = {
      name: data.data.name,
      description: data.data.description,
    };

    if (siteId) {
      updateData.site_id = siteId;
    }

    const { data: result, error: updateError } = await supabase
      .from("Product_category")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating category:", updateError);
      return { error: "Modifica elemento fallita!" };
    }

    // Create a new Action record to track the user action
    const { error: actionError } = await supabase
      .from("Action")
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
