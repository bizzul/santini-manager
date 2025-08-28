"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/clients/create";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props);
  const supabase = await createClient();
  let userId = null;
  let organizationId = null;
  let siteId = null;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;

    // Get organization and site information
    if (domain) {
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
    }
  }

  if (result.success) {
    try {
      const firstInitials = result.data?.individualFirstName
        ? result.data?.individualFirstName.slice(0, 2)
        : undefined;
      const lastInitials = result.data?.individualLastName
        ? result.data?.individualLastName.slice(0, 2)
        : undefined;

      const generatedCode = firstInitials ? firstInitials + lastInitials : "";

      // Prepare the insert data
      const insertData: any = {
        individualTitle: result.data?.clientType === "INDIVIDUAL"
          ? result.data?.individualTitle
          : "",
        businessName: result.data?.clientType === "BUSINESS"
          ? result.data?.businessName
          : "",
        individualFirstName: result.data?.individualFirstName,
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
      };

      // Only add organization and site fields if they exist and have values
      if (organizationId) {
        insertData.organization_id = organizationId;
      }
      if (siteId) {
        insertData.site_id = siteId;
      }

      const { data: saveData, error: createError } = await supabase
        .from("Client")
        .insert(insertData)
        .select()
        .single();

      // console.log("saveData", saveData);

      if (createError) {
        console.error("Error creating client:", createError);
        return {
          message: "Creazione elemento fallita!",
          error: createError.message,
        };
      }

      // Create a new Action record to track the user action
      if (saveData && userId) {
        try {
          // Prepare action data with fallback for missing columns
          const actionData: any = {
            type: "client_create",
            data: {
              clientId: saveData.id,
            },
            user_id: userId,
            site_id: siteId,
            organization_id: organizationId,
          };

          const { error: actionError } = await supabase
            .from("Action")
            .insert(actionData);

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

      revalidatePath("/clients");
      return { success: true, data: saveData };
    } catch (error: any) {
      console.error("Error creating client:", error);
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    console.error("Validation errors:", result.error);
    return {
      message: "Validazione elemento fallita!",
      error: "Validation failed",
    };
  }
}
