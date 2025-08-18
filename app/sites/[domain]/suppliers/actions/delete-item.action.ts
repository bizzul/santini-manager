"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";

export const removeItem = async (formData: any) => {
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

  try {
    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from("supplier")
      .delete()
      .eq("id", formData.id);

    if (deleteError) {
      console.error("Error deleting supplier:", deleteError);
      return { message: "Errore nella cancellazione del fornitore!" };
    }

    // Create a new Action record to track the user action
    const { error: actionError } = await supabase
      .from("Action")
      .insert({
        type: "supplier_delete",
        data: {
          supplierId: formData.id,
        },
        userId: userId,
        supplierId: formData.id,
      });

    return revalidatePath("/suppliers");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
