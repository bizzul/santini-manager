"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { generateTaskCode } from "@/lib/code-generator";

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

      // Get the first column of the selected kanban (order by position to get the first one)
      const { data: firstColumn, error: columnError } = await supabase
        .from("KanbanColumn")
        .select("*")
        .eq("kanbanId", result.data.kanbanId)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (columnError || !firstColumn) {
        console.error("Column error:", columnError);
        return {
          error: true,
          message: `Kanban non valido: nessuna colonna trovata! (${columnError?.message || "Nessuna colonna"})`,
        };
      }

      // Get kanban info to determine task type
      const { data: kanban } = await supabase
        .from("Kanban")
        .select("is_offer_kanban, site_id")
        .eq("id", result.data.kanbanId)
        .single();

      // Use site_id from kanban if not already set
      if (!siteId && kanban?.site_id) {
        siteId = kanban.site_id;
      }

      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      // Generate unique code using atomic sequence (always incremental)
      let uniqueCode = result.data.unique_code;
      if (siteId) {
        const taskType = kanban?.is_offer_kanban ? "OFFERTA" : "LAVORO";
        uniqueCode = await generateTaskCode(siteId, taskType);
      }

      const insertData: any = {
        title: "",
        name: result.data.name,
        clientId: result.data.clientId!,
        deliveryDate: result.data.deliveryDate ? result.data.deliveryDate.toISOString() : null,
        termine_produzione: result.data.termine_produzione ? result.data.termine_produzione.toISOString() : null,
        unique_code: uniqueCode,
        sellProductId: result.data.productId!,
        kanbanId: result.data.kanbanId,
        kanbanColumnId: firstColumn.id,
        sellPrice: result.data.sellPrice,
        numero_pezzi: result.data.numero_pezzi,
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
        return {
          error: true,
          message:
            `Errore nella creazione del task: ${taskCreateError.message}`,
        };
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
      console.error("Validation errors:", result.error?.errors);
      return { error: true, message: "Validazione elemento fallita!", details: result.error?.errors };
    }
  } catch (error: any) {
    console.error("Error creating task:", error);
    // Make sure to return a plain object with the actual error message
    return { 
      error: true, 
      message: `Creazione elemento fallita: ${error.message || "Errore sconosciuto"}` 
    };
  }
}
