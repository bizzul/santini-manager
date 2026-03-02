"use server";

import { revalidatePath } from "next/cache";
import { getUserContext } from "@/lib/auth-utils";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { generateTaskCode, generateInternalTaskCode } from "@/lib/code-generator";

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

    // Determine task type and generate new unique code
    let uniqueCode: string;
    const kanban = originalTask.kanban;
    
    // Normalize category (Supabase may return array for joins)
    const rawCategory = kanban?.category as any;
    const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
    
    if (category && category.is_internal && category.internal_base_code) {
      // Internal category - use internal code generator
      uniqueCode = await generateInternalTaskCode(
        siteId,
        category.id,
        category.internal_base_code
      );
    } else {
      // Standard code generation
      const taskType = kanban?.is_offer_kanban ? "OFFERTA" : "LAVORO";
      uniqueCode = await generateTaskCode(siteId, taskType);
    }

    // Prepare the duplicated task data
    // Copy all relevant fields except id, unique_code, created_at, updated_at
    const duplicateData: any = {
      title: originalTask.title || "",
      name: originalTask.name,
      luogo: originalTask.luogo,
      description: originalTask.description,
      clientId: originalTask.clientId,
      sellProductId: originalTask.sellProductId,
      sellPrice: originalTask.sellPrice,
      deliveryDate: originalTask.deliveryDate,
      termine_produzione: originalTask.termine_produzione,
      other: originalTask.other,
      positions: originalTask.positions,
      numero_pezzi: originalTask.numero_pezzi,
      kanbanId: originalTask.kanbanId,
      kanbanColumnId: originalTask.kanbanColumnId,
      task_type: originalTask.task_type,
      material: originalTask.material,
      metalli: originalTask.metalli,
      ferramenta: originalTask.ferramenta,
      legno: originalTask.legno,
      vernice: originalTask.vernice,
      altro: originalTask.altro,
      stoccato: originalTask.stoccato,
      is_draft: originalTask.is_draft,
      draft_category_ids: originalTask.draft_category_ids,
      unique_code: uniqueCode,
      site_id: siteId,
      // Reset status fields for the new task
      percentStatus: 0,
      percent_status: 0,
      archived: false,
      locked: false,
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
      await supabase.from("TaskSupplier").insert(
        originalSuppliers.map((supplier) => ({
          taskId: newTask.id,
          supplierId: supplier.supplierId,
          deliveryDate: null, // Reset delivery dates for duplicated task
        }))
      );
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
