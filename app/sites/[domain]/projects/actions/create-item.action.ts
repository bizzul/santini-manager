"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";

export async function createItem(props: any) {
  const result = validation.safeParse(props.data);
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
  // console.log("result", result.error);
  try {
    if (result.success) {
      // Require a kanban selection
      if (!result.data.kanbanId) {
        return { error: true, message: "È necessario selezionare un kanban!" };
      }

      const supabase = await createClient();

      // Get the first column of the selected kanban
      const { data: firstColumn, error: columnError } = await supabase
        .from("KanbanColumn")
        .select("*")
        .eq("kanbanId", result.data.kanbanId)
        .eq("position", 1)
        .single();

      if (columnError || !firstColumn) {
        return {
          error: true,
          message: "Kanban non valido: nessuna colonna trovata!",
        };
      }

      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      const { data: taskCreate, error: taskCreateError } = await supabase
        .from("task")
        .insert({
          title: "",
          name: result.data.name,
          clientId: result.data.clientId!,
          deliveryDate: result.data.deliveryDate,
          unique_code: result.data.unique_code,
          sellProductId: result.data.productId!,
          kanbanId: result.data.kanbanId,
          kanbanColumnId: firstColumn.id,
          sellPrice: result.data.sellPrice,
          other: result.data.other,
          positions: positions,
        })
        .select()
        .single();

      if (taskCreateError) {
        console.error("Error creating task:", taskCreateError);
        return { error: true, message: "Errore nella creazione del task!" };
      }

      // Create a new Action record to track the user action
      if (taskCreate && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "task_create",
            data: {
              task: taskCreate.id,
            },
            userId: userId,
          });

        if (actionError) {
          console.error("Error creating action record:", actionError);
        }
      }

      return revalidatePath("/projects");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    console.error("Error creating task:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
