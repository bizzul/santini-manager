"use server";

import { revalidatePath } from "next/cache";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/server";
import { getSiteData } from "@/lib/fetchers";

export async function createItem(props: any, domain?: string) {
  const result = validation.safeParse(props.data);
  const userContext = await getUserContext();
  let userId = null;
  let siteId = null;
  let organizationId = null;

  if (userContext) {
    userId = userContext.user.id;
  }

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
  // console.log("result", result.error);
  try {
    if (result.success) {
      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      const supabase = await createClient();

      // Get the first column of the selected kanban
      const { data: firstColumn, error: columnError } = await supabase
        .from("KanbanColumn")
        .select("*")
        .eq("kanbanId", result.data.kanbanId)
        .eq("position", 1)
        .single();

      if (columnError || !firstColumn) {
        throw new Error("Kanban non valido: nessuna colonna trovata!");
      }

      // Prepare insert data with site_id
      const insertData: any = {
        //@ts-ignore
        title: "",
        clientId: result.data.clientId!,
        deliveryDate: result.data.deliveryDate,
        unique_code: result.data.unique_code,
        sellProductId: result.data.productId!,
        kanbanId: result.data.kanbanId, // Use kanbanId from form
        kanbanColumnId: firstColumn.id, // Use first column of the kanban
        sellPrice: result.data.sellPrice,
        other: result.data.other,
        positions: positions,
      };

      // Add site_id if available
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
        throw new Error("Failed to create task");
      }

      const { data: defaultSuppliers, error: defaultSuppliersError } =
        await supabase.from("Supplier").select("*");

      // Crea le relazioni TaskSupplier per ogni fornitore trovato
      if (defaultSuppliers && defaultSuppliers.length > 0) {
        await supabase.from("TaskSupplier").insert(
          defaultSuppliers.map((supplier) => ({
            taskId: taskCreate.id,
            supplierId: supplier.id,
            deliveryDate: null,
          })),
        );
      }

      // Create a new Action record to track the user action
      const actionData: any = {
        type: "task_create",
        data: {
          task: taskCreate.id,
        },
        user_id: userId,
      };

      // Add site and organization info if available
      if (siteId) {
        actionData.site_id = siteId;
      }
      if (organizationId) {
        actionData.organization_id = organizationId;
      }

      await supabase.from("Action").insert(actionData);

      // return revalidatePath("/kanban?name=PRODUCTION");
      return taskCreate;
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
