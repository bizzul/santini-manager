"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/clients/create";
import { getSiteData } from "@/lib/fetchers";
import { normalizeClientContactPeople } from "@/lib/client-contacts";
import { generateClientCode, normalizeClientType } from "@/lib/client-code";
import { logger } from "@/lib/logger";

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props);
  if (!result.success) {
    console.error("Validation errors:", result.error);
    return {
      message: "Validazione elemento fallita!",
      error: "Validation failed",
    };
  }

  if (!domain) {
    return {
      message: "Errore nel recupero del sito!",
      error: "Site not found",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let siteId: string | null = null;
  let organizationId: string | null = null;

  try {
    const siteResult = await getSiteData(domain);

    if (!siteResult?.data) {
      console.error("No site data returned for domain:", domain);
      return {
        message: "Errore nel recupero del sito!",
        error: "Site not found",
      };
    }

    siteId = siteResult.data.id;
    organizationId = siteResult.data.organization_id;
    logger.debug("Site and organization found:", {
      siteId,
      organizationId,
    });
  } catch (error) {
    console.error("Unexpected error fetching site:", error);
    return {
      message: "Errore imprevisto nel recupero del sito!",
      error: String(error),
    };
  }

  if (!siteId) {
    return {
      message: "Errore nel recupero del sito!",
      error: "Site not found",
    };
  }

  try {
    const clientType = normalizeClientType(result.data.clientType);
    const insertData = {
      individualTitle:
        clientType === "INDIVIDUAL" ? result.data.individualTitle || "" : "",
      businessName:
        clientType === "BUSINESS" ? result.data.businessName || "" : "",
      individualFirstName:
        clientType === "INDIVIDUAL"
          ? result.data.individualFirstName || ""
          : "",
      individualLastName:
        clientType === "INDIVIDUAL" ? result.data.individualLastName || "" : "",
      clientType,
      address: result.data.address,
      addressSecondary: result.data.addressSecondary,
      city: result.data.city,
      countryCode: result.data.countryCode,
      email: result.data.email,
      mobilePhone: result.data.phone,
      landlinePhone: result.data.phone,
      zipCode: result.data.zipCode !== 0 ? result.data.zipCode : null,
      clientLanguage: result.data.clientLanguage?.trim() || "Italiano",
      contactPeople: normalizeClientContactPeople(result.data.contactPeople),
      code: generateClientCode({ ...result.data, clientType }),
      site_id: siteId,
      organization_id: organizationId,
    };

    const { data: saveData, error: createError } = await supabase
      .from("Client")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating client:", createError);
      return {
        message: "Creazione elemento fallita!",
        error: createError.message,
      };
    }

    if (saveData && user?.id) {
      try {
        const { error: actionError } = await supabase.from("Action").insert({
          type: "client_create",
          data: {
            clientId: saveData.id,
          },
          user_id: user.id,
          site_id: siteId,
          organization_id: organizationId,
          clientId: saveData.id,
        });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      } catch (actionError) {
        console.error(
          "Unexpected error creating action record:",
          actionError,
        );
      }
    }

    revalidatePath(`/sites/${domain}/clients`);
    revalidatePath("/clients");
    return { success: true, data: saveData };
  } catch (error: any) {
    console.error("Error creating client:", error);
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
