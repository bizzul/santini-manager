"use server";

import { Client } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/clients/create";
import { normalizeClientContactPeople } from "@/lib/client-contacts";
import { generateClientCode, normalizeClientType } from "@/lib/client-code";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

export async function editItem(props: Client, id: number, domain: string) {
  const result = validation.safeParse(props);
  const supabase = await createClient();
  let userId = null;
  let siteId = null;
  let organizationId = null;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (result.success) {
    try {
      // Use getSiteData function which properly handles subdomain extraction
      const siteResult = await getSiteData(domain);

      if (!siteResult?.data) {
        console.error("No site data returned for domain:", domain);
        return {
          message: "Errore nel recupero del sito!",
          error: "Site not found",
        };
      }

      const siteData = siteResult.data;
      siteId = siteData.id;
      organizationId = siteData.organization_id;
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

    try {
      const clientType = normalizeClientType(result.data.clientType);

      const { data: saveData, error: updateError } = await supabase
        .from("Client")
        .update({
          individualTitle:
            clientType === "INDIVIDUAL" ? result.data.individualTitle || "" : "",
          businessName:
            clientType === "BUSINESS" ? result.data.businessName || "" : "",
          individualFirstName:
            clientType === "INDIVIDUAL"
              ? result.data.individualFirstName || ""
              : "",
          individualLastName:
            clientType === "INDIVIDUAL"
              ? result.data.individualLastName || ""
              : "",
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
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating client:", updateError);
        return {
          message: "Errore nell'aggiornamento del cliente!",
          error: updateError.message,
        };
      }

      // Create a new Action record to track the user action
      if (saveData && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "client_update",
            data: {
              clientId: saveData.id,
            },
            user_id: userId,
            site_id: siteId,
            organization_id: organizationId,
            clientId: saveData.id,
          });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      revalidatePath(`/sites/${domain}/clients`);
      revalidatePath("/clients");
      return { success: true, data: saveData };
    } catch (error: any) {
      console.error("Error updating client:", error);
      // Make sure to return a plain object
      return {
        message: "Aggiornamento elemento fallito!",
        error: error.message,
      };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
