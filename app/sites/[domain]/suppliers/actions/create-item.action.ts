"use server";

import { createClient } from "@/utils/server";
import { validation } from "@/validation/supplier/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

const log = logger.scope("Suppliers");

export async function createItem(props: any, domain?: string) {
  log.debug("createItem called with props:", props);
  log.debug("createItem called with domain:", domain);

  const result = validation.safeParse(props);
  log.debug("Validation result success:", result.success);
  if (!result.success) {
    log.warn("Validation errors:", result.error.format());
  }

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
    // Use the authId directly as it's a string and matches Action.user_id type
    userId = session.user.id;
  }

  if (result.success) {
    try {
      const supabase = await createClient();
      const insertData: any = {
        description: result.data.description,
        name: result.data.name,
        address: result.data.address,
        cap: result.data.cap,
        supplier_category_id: result.data.supplier_category_id || null,
        contact: result.data.contact,
        email: result.data.email,
        location: result.data.location,
        phone: result.data.phone,
        short_name: result.data.short_name,
        website: result.data.website,
      };

      if (siteId) {
        insertData.site_id = siteId;
      }

      const { data: resultSave, error: resultSaveError } = await supabase
        .from("Supplier")
        .insert(insertData)
        .select()
        .single();

      if (resultSaveError) {
        log.error("Error creating supplier:", resultSaveError);
        return { message: "Creazione elemento fallita!" };
      }

      // Create a new Action record to track the user action
      if (resultSave && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "supplier_create",
            data: {
              supplierId: resultSave.id,
            },
            user_id: userId,
            supplierId: resultSave.id,
          });

        if (actionError) {
          log.error("Error creating action record:", actionError);
        }
      }

      // return revalidatePath("/suppliers");
      return resultSave;
    } catch (error: any) {
      log.error("Error creating supplier:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    log.warn("Validation failed:", result.error.format());
    return {
      message: "Validazione elemento fallita!",
      errors: result.error.format(),
    };
  }
}
