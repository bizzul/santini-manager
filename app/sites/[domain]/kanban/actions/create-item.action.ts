"use server";

import { revalidatePath } from "next/cache";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/server";

export async function createItem(props: any) {
  const result = validation.safeParse(props.data);
  const userContext = await getUserContext();
  let userId = null;
  if (userContext) {
    userId = userContext.user.id;
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
      const { data: taskCreate, error: taskCreateError } = await supabase
        .from("task")
        .insert({
          //@ts-ignore
          title: "",
          clientId: result.data.clientId!,
          deliveryDate: result.data.deliveryDate,
          unique_code: result.data.unique_code,
          sellProductId: result.data.productId!,
          kanbanId: "PRODUCTION", // in which KanBan is created
          kanbanColumnId: "TODOPROD", // in which Column is created
          sellPrice: result.data.sellPrice,
          other: result.data.other,
          positions: positions,
        })
        .select()
        .single();

      if (taskCreateError) {
        console.error("Error creating task:", taskCreateError);
        throw new Error("Failed to create task");
      }

      const { data: defaultSuppliers, error: defaultSuppliersError } =
        await supabase.from("supplier").select("*");

      // Crea le relazioni TaskSupplier per ogni fornitore trovato
      if (defaultSuppliers && defaultSuppliers.length > 0) {
        await supabase.from("task_supplier").insert(
          defaultSuppliers.map((supplier) => ({
            taskId: taskCreate.id,
            supplierId: supplier.id,
            deliveryDate: null,
          })),
        );
      }

      // Create a new Action record to track the user action
      await supabase.from("action").insert({
        type: "task_create",
        data: {
          task: taskCreate.id,
        },
        user_id: userId,
      });

      return revalidatePath("/kanban?name=PRODUCTION");
    } else {
      return { error: true, message: "Validazione elemento fallita!" };
    }
  } catch (error: any) {
    // Make sure to return a plain object
    return { message: "Creazione elemento fallita!", error: error.message };
  }
}
