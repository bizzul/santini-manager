"use server";

import { createClient } from "@/utils/server";
import { validation } from "@/validation/reseller/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

const log = logger.scope("Resellers");

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props);

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
    const insertData: any = {
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
    };

    if (siteId) {
      insertData.site_id = siteId;
    }

    const { data: resultSave, error: resultSaveError } = await supabase
      .from("Reseller")
      .insert(insertData)
      .select()
      .single();

    if (resultSaveError) {
      log.error("Error creating reseller:", resultSaveError);
      return { message: "Creazione elemento fallita!" };
    }

    if (resultSave && userId) {
      const { error: actionError } = await supabase.from("Action").insert({
        type: "reseller_create",
        data: {
          resellerId: resultSave.id,
        },
        user_id: userId,
      });

      if (actionError) {
        log.error("Error creating action record:", actionError);
      }
    }

    return resultSave;
  } catch (error: any) {
    log.error("Error creating reseller:", error);
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
