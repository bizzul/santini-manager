"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

// Postgres error code for foreign_key_violation. When a SellProduct is still
// referenced by another table (es. Task), the delete fails with this code.
const FK_VIOLATION_CODE = "23503";

function formatSupabaseDeleteError(
  error: { code?: string; message?: string; details?: string | null } | null,
  context: "single" | "batch",
): string {
  if (!error) return "Errore durante l'eliminazione";

  if (error.code === FK_VIOLATION_CODE) {
    return context === "batch"
      ? "Uno o più prodotti selezionati sono collegati a commesse o documenti esistenti e non possono essere eliminati."
      : "Il prodotto è collegato a commesse o documenti esistenti e non può essere eliminato.";
  }

  const detail = error.details || error.message;
  return detail
    ? `Errore durante l'eliminazione: ${detail}`
    : "Errore durante l'eliminazione";
}

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
    throw new Error(formatSupabaseDeleteError(sellProductError, "single"));
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

export const removeItem = async (
  data: { id: number } | FormData,
  domain?: string,
) => {
  try {
    // Handle both object with id and FormData
    let id: number;
    if (data instanceof FormData) {
      id = Number(data.get("id"));
    } else {
      id = data.id;
    }

    if (!id || isNaN(id)) {
      console.error("Invalid product ID:", id);
      return { message: "ID prodotto non valido" };
    }

    await removeProduct(id, domain);
    return revalidatePath("/products");
  } catch (error) {
    console.error("Error deleting sell product:", error);
    const message = error instanceof Error && error.message
      ? error.message
      : "Errore durante l'eliminazione";
    return { message };
  }
};

/**
 * Batch delete multiple products
 */
export const batchDeleteProducts = async (
  ids: number[],
  domain?: string,
): Promise<{ success: boolean; deleted: number; message?: string }> => {
  const supabase = await createClient();
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;

  if (!ids || ids.length === 0) {
    return { success: false, deleted: 0, message: "Nessun ID fornito" };
  }

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

  try {
    // Build delete query
    let deleteQuery = supabase
      .from("SellProduct")
      .delete()
      .in("id", ids);

    if (siteId) {
      deleteQuery = deleteQuery.eq("site_id", siteId);
    }

    const { data: deletedProducts, error } = await deleteQuery.select("id");

    if (error) {
      console.error("Error batch deleting products:", error);
      return {
        success: false,
        deleted: 0,
        message: formatSupabaseDeleteError(error, "batch"),
      };
    }

    const deletedCount = deletedProducts?.length || 0;

    // Create action records for each deleted product
    if (deletedProducts && deletedProducts.length > 0 && userId) {
      const actionRecords = deletedProducts.map((product) => ({
        type: "sell_product_delete",
        data: { sellProductId: product.id },
        user_id: userId,
      }));

      const { error: actionError } = await supabase
        .from("Action")
        .insert(actionRecords);

      if (actionError) {
        console.error("Error creating action records:", actionError);
      }
    }

    revalidatePath("/products");
    return { success: true, deleted: deletedCount };
  } catch (error) {
    console.error("Error in batch delete:", error);
    const message = error instanceof Error && error.message
      ? error.message
      : "Errore durante l'eliminazione";
    return {
      success: false,
      deleted: 0,
      message,
    };
  }
};
