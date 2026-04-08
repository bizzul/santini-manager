"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/server";

type UpdateSellProductImageInput = {
  productId: number;
  imageUrl: string | null;
  domain?: string;
  siteId?: string;
};

export async function updateSellProductImageAction({
  productId,
  imageUrl,
  domain,
  siteId: siteIdParam,
}: UpdateSellProductImageInput) {
  const userContext = await getUserContext();
  let siteId = siteIdParam || null;

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

  try {
    const supabase = await createClient();
    let query = supabase
      .from("SellProduct")
      .update({
        image_url: imageUrl,
      })
      .eq("id", productId);

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data: sellProduct, error } = await query.select("id").single();

    if (error || !sellProduct) {
      console.error("Error updating sell product image:", error);
      return { error: "Aggiornamento immagine fallito." };
    }

    if (userContext?.user?.id) {
      const { error: actionError } = await supabase.from("Action").insert({
        type: "sell_product_update_image",
        data: {
          sellProductId: sellProduct.id,
          imageUrl,
        },
        user_id: userContext.user.id,
      });

      if (actionError) {
        console.error("Error creating image update action:", actionError);
      }
    }

    if (domain) {
      revalidatePath(`/sites/${domain}/products/${productId}`);
      revalidatePath(`/sites/${domain}/products`);
    }
    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("Error updating sell product image:", error);
    return { error: "Aggiornamento immagine fallito." };
  }
}
