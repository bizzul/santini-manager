"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function editItem(formData: any, id: number, domain?: string) {
  const result = validation.safeParse(formData);
  const session = await getUserContext();
  let userId = null;
  let siteId = null;
  let organizationId = null;

  // Get site information
  if (domain) {
    try {
      const siteResult = await getSiteData(domain);
      if (siteResult?.data) {
        siteId = siteResult.data.id;
        organizationId = siteResult.data.organization_id;
      }
    } catch (error) {
      console.error("Error fetching site data:", error);
    }
  }

  if (session && session.user && session.user.id) {
    // Use the authId directly from the session (Supabase Auth user ID)
    userId = session.user.id;
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

      // Verify that the task belongs to the current site
      if (siteId) {
        const { data: existingTask, error: taskError } = await supabase
          .from("Task")
          .select("site_id")
          .eq("id", id)
          .single();

        if (taskError || !existingTask) {
          return { error: true, message: "Task non trovato!" };
        }

        if (existingTask.site_id !== siteId) {
          return {
            error: true,
            message: "Non autorizzato a modificare questo task!",
          };
        }
      }

      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );
      console.log("positions", positions);

      const { data: taskCreate, error: taskUpdateError } = await supabase
        .from("Task")
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
        const actionData: any = {
          type: "task_update",
          data: {
            task: taskCreate.id,
          },
          user_id: session.user.id, // Use authId directly
        };

        if (siteId) {
          actionData.site_id = siteId;
        }
        if (organizationId) {
          actionData.organization_id = organizationId;
        }

        const { error: actionError } = await supabase
          .from("Action")
          .insert(actionData);

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
