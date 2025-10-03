"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props.data);
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
    userId = session.user.id;
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

      const insertData: any = {
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
      };

      if (siteId) {
        insertData.site_id = siteId;
      }

      const { data: taskCreate, error: taskCreateError } = await supabase
        .from("Task")
        .insert(insertData)
        .select()
        .single();

      if (taskCreateError) {
        console.error("Error creating task:", taskCreateError);
        return { error: true, message: "Errore nella creazione del task!" };
      }

      // Create a new Action record to track the user action
      if (taskCreate && userId) {
        const actionData: any = {
          type: "task_create",
          data: {
            task: taskCreate.id,
          },
          user_id: userId,
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
    console.error("Error creating task:", error);
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
