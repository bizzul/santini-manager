"use server";

import { Supplier_category } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { validation } from "@/validation/supplierCategory/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

const log = logger.scope("SupplierCategoryCreate");

export async function createItem(
  props: Pick<Supplier_category, "name" | "code" | "description">,
  domain?: string,
) {
  log.debug("createItem called", { props, domain });

  const result = validation.safeParse(props);
  const supabase = createServiceClient();
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;

  // Get site information
  if (domain) {
    try {
      log.debug("Fetching site data for domain:", domain);
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
        log.debug("Site ID found:", siteId);
      } else {
        log.warn("No site data found for domain:", domain);
      }
    } catch (error) {
      log.error("Error fetching site data:", error);
    }
  } else {
    log.warn("No domain provided");
  }

  if (userContext) {
    userId = userContext.user.id;
    log.debug("User ID:", userId);
  } else {
    log.warn("No user context found");
  }

  if (!result.success) {
    log.warn("Validation failed:", result.error.errors);
    return {
      message: "Validazione elemento fallita!",
      error: result.error.message,
    };
  }

  log.debug("Validation passed");

  try {
    const insertData: any = {
      name: props.name,
      code: props.code || null,
      description: props.description,
    };

    if (siteId) {
      insertData.site_id = siteId;
    }

    log.debug("Inserting supplier category:", insertData);

    const { data, error } = await supabase
      .from("Supplier_category")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      log.error("Error creating supplier category:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }

    log.info("Supplier category created successfully:", data);

    if (data && userId) {
      // Create a new Action record to track the user action
      const { error: actionError } = await supabase
        .from("Action")
        .insert({
          type: "supplier_category_create",
          data: {
            category_id: data.id,
          },
          user_id: userId,
        });

      if (actionError) {
        log.error("Error creating action record:", actionError);
      } else {
        log.debug("Action record created");
      }
    }

    revalidatePath("/supplier-categories");
    log.debug("Path revalidated, returning success");
    return { success: true, data };
  } catch (error: any) {
    log.error("Error creating supplier category:", error);
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
