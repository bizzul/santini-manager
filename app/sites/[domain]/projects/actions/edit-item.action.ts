"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/server";
import { validation } from "@/validation/task/create";
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
  // console.log("result", result.error);
  try {
    if (result.success) {
      const supabase = await createClient();

      // Get the first column of the selected kanban if kanban is being changed
      let firstColumn;
      if (result.data.kanbanId) {
        const { data: columnData, error: columnError } = await supabase
          .from("KanbanColumn")
          .select("*")
          .eq("kanbanId", result.data.kanbanId)
          .eq("position", 1)
          .single();

        if (columnError) {
          console.error("Error fetching first column:", columnError);
          return { error: true, message: "Errore nel recupero della colonna!" };
        }

        firstColumn = columnData;
      }

      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );
      console.log("positions", positions);

      const { data: taskCreate, error: taskUpdateError } = await supabase
        .from("task")
        .update({
          unique_code: result.data?.unique_code || null,
          name: result.data?.name || null,
          deliveryDate: result.data.deliveryDate || null,
          other: result.data?.other || null,
          sellPrice: result.data?.sellPrice
            ? Number(result.data?.sellPrice)
            : null,
          clientId: result.data?.clientId
            ? Number(result.data?.clientId)
            : null,
          sellProductId: result.data?.productId
            ? Number(result.data?.productId)
            : null,
          kanbanId: result.data?.kanbanId
            ? Number(result.data?.kanbanId)
            : null,
          kanbanColumnId: firstColumn ? firstColumn.id : null, // Only update column if kanban was changed
          positions: positions || null,
        })
        .eq("id", Number(id))
        .select()
        .single();

      if (taskUpdateError) {
        console.error("Error updating task:", taskUpdateError);
        return { error: true, message: "Errore nell'aggiornamento del task!" };
      }

      // Create a new Action record to track the user action
      if (taskCreate && userId) {
        const { error: actionError } = await supabase
          .from("Action")
          .insert({
            type: "task_update",
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
    console.error("Error updating task:", error);
    // Make sure to return a plain object
    return { message: "Aggiornamento elemento fallito!", error: error.message };
  }
}
