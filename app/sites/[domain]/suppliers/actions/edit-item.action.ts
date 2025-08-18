"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/supplier/edit";
import { getUserContext } from "@/lib/auth-utils";

export async function editItem(formData: any, id: number) {
  const result = validation.safeParse(formData);
  const session = await getUserContext();
  let userId = null;
  if (session && session.user && session.user.id) {
    // Get the integer user ID from the User table using the authId
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("authId", session.user.id)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
      return { error: true, message: "Errore nel recupero dei dati utente!" };
    }

    userId = userData?.id;
  }

  if (result.success) {
    try {
      const supabase = await createClient();
      const { data: resultUpdate, error: resultUpdateError } = await supabase
        .from("supplier")
        .update({
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
        })
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
            userId: userId,
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
