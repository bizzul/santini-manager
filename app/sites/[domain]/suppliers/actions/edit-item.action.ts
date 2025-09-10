"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/supplier/edit";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function editItem(formData: any, id: number, domain?: string) {
  const result = validation.safeParse(formData);
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
      const updateData: any = {
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
        updateData.site_id = siteId;
      }

      const { data: resultUpdate, error: resultUpdateError } = await supabase
        .from("Supplier")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (resultUpdateError) {
        console.error("Error updating supplier:", resultUpdateError);
        return { message: "Errore nell'aggiornamento del fornitore!" };
      }

      // Create a new Action record to track the user action
      if (resultUpdate && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "supplier_update",
            data: {
              supplierId: resultUpdate.id,
            },
            user_id: userId,
            supplierId: resultUpdate.id,
          });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      // return revalidatePath("/suppliers");
      return resultUpdate;
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      // Make sure to return a plain object
      return { message: "Creazione elemento fallita!", error: error.message };
    }
  } else {
    return { message: "Validazione elemento fallita!" };
  }
}
