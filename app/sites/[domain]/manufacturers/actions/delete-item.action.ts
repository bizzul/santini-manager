"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

const log = logger.scope("Manufacturers");

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
      log.error("Error fetching site data:", error);
    }
  }

  if (session && session.user && session.user.id) {
    userId = session.user.id;
  }

  try {
    const supabase = await createClient();

    // Build delete query with site_id filter if available
    let deleteQuery = supabase
      .from("Manufacturer")
      .delete()
      .eq("id", formData.id);

    if (siteId) {
      deleteQuery = deleteQuery.eq("site_id", siteId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      log.error("Error deleting manufacturer:", deleteError);
      return { message: "Errore nella cancellazione del produttore!" };
    }

    // Create a new Action record to track the user action
    const { error: actionError } = await supabase.from("Action").insert({
      type: "manufacturer_delete",
      data: {
        manufacturerId: formData.id,
      },
      user_id: userId,
    });

    return revalidatePath("/manufacturers");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
