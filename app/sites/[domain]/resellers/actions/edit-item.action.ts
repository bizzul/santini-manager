"use server";

import { createClient } from "@/utils/server";
import { validation } from "@/validation/reseller/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

const log = logger.scope("Resellers");

export async function editItem(formData: any, id: number, domain?: string) {
  const result = validation.safeParse(formData);

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

  if (!result.success) {
    log.warn("Validation failed:", result.error.format());
    return {
      message: "Validazione elemento fallita!",
      errors: result.error.format(),
    };
  }

  try {
    const supabase = await createClient();
    const updateData: any = {
      name: result.data.name,
      contact_person: result.data.contact_person || null,
      country: result.data.country || null,
      country_code: result.data.country_code || null,
      address: result.data.address || null,
      zip_city: result.data.zip_city || null,
      phone: result.data.phone || null,
      fax: result.data.fax || null,
      mobile: result.data.mobile || null,
      email: result.data.email || null,
      website: result.data.website || null,
      notes: result.data.notes || null,
      updated_at: new Date().toISOString(),
    };

    let updateQuery = supabase.from("Reseller").update(updateData).eq("id", id);

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { data: resultUpdate, error: resultUpdateError } = await updateQuery
      .select()
      .single();

    if (resultUpdateError) {
      log.error("Error updating reseller:", resultUpdateError);
      return { message: "Errore nell'aggiornamento del rivenditore!" };
    }

    if (resultUpdate && userId) {
      const { error: actionError } = await supabase.from("Action").insert({
        type: "reseller_update",
        data: {
          resellerId: resultUpdate.id,
        },
        user_id: userId,
      });

      if (actionError) {
        log.error("Error creating action record:", actionError);
      }
    }

    return resultUpdate;
  } catch (error: any) {
    log.error("Error updating reseller:", error);
    return {
      message: "Aggiornamento elemento fallito!",
      error: error.message,
    };
  }
}
