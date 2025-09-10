"use server";

import { createClient } from "@/utils/server";
import { validation } from "@/validation/supplier/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props);
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
      console.error("Error fetching site data:", error);
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
        category: result.data.category,
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
        console.error("Error creating supplier:", resultSaveError);
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
          console.error("Error creating action record:", actionError);
        }
      }

      // return revalidatePath("/suppliers");
      return resultSave;
    } catch (error: any) {
      console.error("Error creating supplier:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    console.log("Validation failed:", result.error);
    return { message: "Validazione elemento fallita!", errors: result.error };
  }
}
