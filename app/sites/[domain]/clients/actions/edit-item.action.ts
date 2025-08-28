"use server";

import { Client } from "@/types/supabase";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/clients/create";
import { getSiteData } from "@/lib/fetchers";

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
      console.log("Site and organization found:", {
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
      const firstInitials = result.data?.individualFirstName
        ? result.data?.individualFirstName.slice(0, 2)
        : undefined;
      const lastInitials = result.data?.individualLastName
        ? result.data?.individualLastName.slice(0, 2)
        : undefined;

      const generatedCode = firstInitials ? firstInitials + lastInitials : "";
      // Concatenate the initials using the + operator

      const { data: saveData, error: updateError } = await supabase
        .from("client")
        .update({
          individualTitle: result.data?.clientType === "INDIVIDUAL"
            ? result.data?.individualTitle
            : "",
          businessName: result.data?.clientType === "BUSINESS"
            ? result.data?.businessName
            : "",
          individualFirstName: result.data?.individualFirstName,
          //@ts-ignore
          clientType: result.data.clientType,
          individualLastName: result.data?.individualLastName,
          address: result.data?.address,
          city: result.data?.city,
          countryCode: result.data?.countryCode,
          email: result.data?.email,
          mobilePhone: result.data?.phone,
          landlinePhone: result.data?.phone,
          zipCode: result.data?.zipCode !== 0 ? result.data?.zipCode : null,
          clientLanguage: result.data?.clientLanguage,
          code: generatedCode,
        })
        .eq("id", id)
        .select()
        .single();

      // Create a new Action record to track the user action
      const { error: actionError } = await supabase
        .from("actions")
        .insert({
          type: "client_update",
          data: {
            clientId: saveData?.id,
          },
          user_id: userId,
          site_id: siteId,
          organization_id: organizationId,
        });

      console.log(actionError);

      return revalidatePath("/clients");
    } catch (error: any) {
      console.error("Error creating product:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
