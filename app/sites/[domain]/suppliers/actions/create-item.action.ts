"use server";

import { createClient } from "@/utils/server";
import { validation } from "@/validation/supplier/create";
import { getUserContext } from "@/lib/auth-utils";

export async function createItem(props: any) {
  const result = validation.safeParse(props);
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

  console.log("userId", userId);
  if (result.success) {
    try {
      const supabase = await createClient();
      const { data: resultSave, error: resultSaveError } = await supabase
        .from("supplier")
        .insert({
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
            userId: userId,
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
    return { message: "Validazione elemento fallita!" };
  }
}
