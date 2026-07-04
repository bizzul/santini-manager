"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

const log = logger.scope("Resellers");

export const removeItem = async (id: number, domain?: string) => {
  const session = await getUserContext();
  let userId = null;
  let siteId = null;

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

  if (session?.user?.id) {
    userId = session.user.id;
  }

  try {
    const supabase = await createClient();

    let deleteQuery = supabase.from("Reseller").delete().eq("id", id);

    if (siteId) {
      deleteQuery = deleteQuery.eq("site_id", siteId);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      log.error("Error deleting reseller:", deleteError);
      return { message: "Errore nella cancellazione del rivenditore!" };
    }

    if (userId) {
      const { error: actionError } = await supabase.from("Action").insert({
        type: "reseller_delete",
        data: {
          resellerId: id,
        },
        user_id: userId,
      });

      if (actionError) {
        log.error("Error creating action record:", actionError);
      }
    }

    return revalidatePath("/resellers");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
