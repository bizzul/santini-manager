"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { createClient } from "@/utils/server";
import { createSellProduct } from "./create-item.action";

export async function duplicateSellProductAction(
  productId: number,
  domain?: string,
  siteIdParam?: string,
) {
  const supabase = await createClient();
  const userContext = await getUserContext();
  let siteId = siteIdParam || null;
  let userId = userContext?.user?.id || null;

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
    let query = supabase
      .from("SellProduct")
      .select("*, category:category_id(id, name)")
      .eq("id", productId);

    if (siteId) {
      query = query.eq("site_id", siteId);
    }

    const { data: originalProduct, error } = await query.single();

    if (error || !originalProduct) {
      return { error: "Prodotto non trovato." };
    }

    const category = Array.isArray(originalProduct.category)
      ? originalProduct.category[0]
      : originalProduct.category;
    const duplicatedName = originalProduct.name
      ? `${originalProduct.name} copia`
      : "Nuovo prodotto copia";

    const duplicated = await createSellProduct(
      {
        category: category?.name || "",
        name: duplicatedName,
        subcategory:
          originalProduct.subcategory || originalProduct.type || "",
        product_type: originalProduct.product_type || "",
        type: originalProduct.subcategory || originalProduct.type || "",
        description: originalProduct.description || "",
        supplier_id: originalProduct.supplier_id ?? undefined,
        price_list: originalProduct.price_list ?? false,
        image_url: originalProduct.image_url || "",
        doc_url: originalProduct.doc_url || "",
        active: originalProduct.active ?? true,
      },
      domain,
      siteId || originalProduct.site_id,
    );

    if (!duplicated?.success || !duplicated.data) {
      return { error: "Duplicazione prodotto fallita." };
    }

    if (userId) {
      const { error: actionError } = await supabase.from("Action").insert({
        type: "sell_product_duplicate",
        data: {
          originalSellProductId: originalProduct.id,
          duplicatedSellProductId: duplicated.data.id,
        },
        user_id: userId,
      });

      if (actionError) {
        console.error("Error creating duplicate action record:", actionError);
      }
    }

    if (domain) {
      revalidatePath(`/sites/${domain}/products`);
    }
    revalidatePath("/products");

    return {
      success: true,
      data: duplicated.data,
      message: `Prodotto "${duplicatedName}" duplicato correttamente.`,
    };
  } catch (error) {
    console.error("Error duplicating sell product:", error);
    return { error: "Duplicazione prodotto fallita." };
  }
}
