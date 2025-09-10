"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export const removeItem = async (formData: any, domain?: string) => {
  const session = await getUserContext();
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

  if (session && session.user && session.user.id) {
    // Use the authId directly as it's a string and matches Action.user_id type
    userId = session.user.id;
  }

  try {
    const supabase = await createClient();

    // Build delete query with site_id filter if available
    let deleteQuery = supabase
      .from("Supplier")
      .delete()
      .eq("id", formData.id);

    if (siteId) {
      deleteQuery = deleteQuery.eq("site_id", siteId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error("Error deleting supplier:", deleteError);
      return { message: "Errore nella cancellazione del fornitore!" };
    }

    // Create a new Action record to track the user action
    const { error: actionError } = await supabase
      .from("Action")
      .insert({
        type: "supplier_delete",
        data: {
          supplierId: formData.id,
        },
        user_id: userId,
        supplierId: formData.id,
      });

    return revalidatePath("/suppliers");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
