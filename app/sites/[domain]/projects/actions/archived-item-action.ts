"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { getUserContext } from "@/lib/auth-utils";

export async function archiveItem(archived: boolean, id: number) {
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
    const { data: archiveTask, error: archiveTaskError } = await supabase
      .from("task")
      .update({
        archived: archived,
      })
      .eq("id", id)
      .select()
      .single();

    // Create a new Action record to track the user action
    const { data: action, error: actionError } = await supabase
      .from("Action")
      .insert({
        type: "task_update",
        data: {
          task: archiveTask.id,
        },
        userId: userId,
      });

    return revalidatePath("/projects");
  } catch (error: any) {
    console.error("Error creating Error:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
