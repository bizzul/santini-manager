"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function duplicateItem(taskId: number, domain?: string) {
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

  try {
    const supabase = await createClient();

    // Fetch the original task with all its data
    const { data: originalTask, error: fetchError } = await supabase
      .from("Task")
      .select(`
        *,
        kanban:kanbanId(
          id,
          is_offer_kanban,
          site_id,
          category_id,
          category:KanbanCategory!category_id(
            id,
            is_internal,
            internal_base_code
          )
        )
      `)
      .eq("id", taskId)
      .single();

    if (fetchError || !originalTask) {
      return { error: true, message: "Task non trovato!" };
    }

    // Verify the task belongs to the current site
    if (siteId && originalTask.site_id !== siteId) {
      return {
        error: true,
        message: "Non autorizzato a duplicare task di altri siti!",
      };
    }

    // Use the original task's site_id if not already set
    if (!siteId) {
      siteId = originalTask.site_id;
    }

    // Duplicate code must be original code + "C" (and keep appending "C" if already used)
    const baseUniqueCode = `${originalTask.unique_code || taskId}C`;
    let uniqueCode = baseUniqueCode;
    let safetyCounter = 0;

    while (safetyCounter < 20) {
      const duplicateCodeCheck = await supabase
        .from("Task")
        .select("id")
        .eq("site_id", siteId)
        .eq("unique_code", uniqueCode)
        .limit(1)
        .maybeSingle();

      if (duplicateCodeCheck.error) {
        return {
          error: true,
          message: `Errore nella verifica del codice duplicato: ${duplicateCodeCheck.error.message}`,
        };
      }

      if (!duplicateCodeCheck.data) {
        break;
      }

      uniqueCode = `${uniqueCode}C`;
      safetyCounter += 1;
    }

    if (safetyCounter >= 20) {
      return {
        error: true,
        message: "Impossibile generare un codice duplicato univoco.",
      };
    }

    // Clone full task row and override only immutable/generated fields
    const { id, created_at, updated_at, unique_code, kanban, ...taskToClone } =
      originalTask as any;
    const duplicateData: any = {
      ...taskToClone,
      unique_code: uniqueCode,
      site_id: siteId,
    };

    // Create the duplicated task
    const { data: newTask, error: createError } = await supabase
      .from("Task")
      .insert(duplicateData)
      .select()
      .single();

    if (createError) {
      console.error("Error duplicating task:", createError);
      return {
        error: true,
        message: `Errore nella duplicazione: ${createError.message}`,
      };
    }

    // Copy TaskSupplier relations
    const { data: originalSuppliers } = await supabase
      .from("TaskSupplier")
      .select("*")
      .eq("taskId", taskId);

    if (originalSuppliers && originalSuppliers.length > 0) {
      const { error: supplierInsertError } = await supabase.from("TaskSupplier").insert(
        originalSuppliers.map((supplier) => ({
          taskId: newTask.id,
          supplierId: supplier.supplierId,
          deliveryDate: supplier.deliveryDate,
        }))
      );

      if (supplierInsertError) {
        return {
          error: true,
          message: `Errore nella duplicazione dei fornitori: ${supplierInsertError.message}`,
        };
      }
    }

    // Copy task files (including project images used by the card cover)
    const { data: originalFiles, error: originalFilesError } = await supabase
      .from("File")
      .select("*")
      .eq("taskId", taskId);

    if (originalFilesError) {
      return {
        error: true,
        message: `Errore nel recupero dei file progetto: ${originalFilesError.message}`,
      };
    }

    if (originalFiles && originalFiles.length > 0) {
      const filesToInsert = originalFiles.map((file) => ({
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        storage_path: file.storage_path,
        cloudinaryId: file.cloudinaryId,
        taskId: newTask.id,
      }));

      const { error: insertFilesError } = await supabase
        .from("File")
        .insert(filesToInsert);

      if (insertFilesError) {
        return {
          error: true,
          message: `Errore nella duplicazione dei file progetto: ${insertFilesError.message}`,
        };
      }
    }

    // Create action record for tracking
    if (userId) {
      const actionData: any = {
        type: "task_duplicate",
        data: {
          originalTaskId: taskId,
          newTaskId: newTask.id,
          originalCode: originalTask.unique_code,
          newCode: uniqueCode,
        },
        user_id: userId,
      };

      if (siteId) {
        actionData.site_id = siteId;
      }
      if (organizationId) {
        actionData.organization_id = organizationId;
      }

      await supabase.from("Action").insert(actionData);
    }

    revalidatePath("/kanban");
    return { 
      success: true, 
      task: newTask,
      message: `Progetto duplicato con codice ${uniqueCode}` 
    };
  } catch (error: any) {
    console.error("Error in duplicateItem:", error);
    return {
      error: true,
      message: error.message || "Duplicazione fallita!",
    };
  }
}
