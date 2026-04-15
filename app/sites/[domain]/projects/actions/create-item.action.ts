"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { validation } from "@/validation/task/create";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteData } from "@/lib/fetchers";
import { generateTaskCode, generateInternalTaskCode } from "@/lib/code-generator";
import { createProjectFolders } from "@/lib/project-folders";
import { toDateString } from "@/lib/utils";

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

      // Get the target column - either the specified one or the first column of the kanban
      let targetColumnId = result.data.kanbanColumnId;
      
      if (targetColumnId) {
        // Verify the column belongs to the selected kanban
        const { data: specifiedColumn, error: columnCheckError } = await supabase
          .from("KanbanColumn")
          .select("*")
          .eq("id", targetColumnId)
          .eq("kanbanId", result.data.kanbanId)
          .single();
        
        if (columnCheckError || !specifiedColumn) {
          // Fall back to first column if specified column is invalid
          console.warn("Specified column not found or doesn't belong to kanban, falling back to first column");
          targetColumnId = null;
        }
      }
      
      // If no valid column specified, get the first column (legacy-compatible query chain)
      if (!targetColumnId) {
        const { data: firstColumn, error: columnError } = await supabase
          .from("KanbanColumn")
          .select("*")
          .eq("kanbanId", result.data.kanbanId)
          .eq("position", 1)
          .single();

        if (columnError || !firstColumn) {
          console.error("Column error:", columnError);
          return {
            error: true,
            message: "Kanban non valido: nessuna colonna trovata!",
          };
        }
        targetColumnId = firstColumn.id;
      }

      // Fetch kanban info only when needed to compute generated codes.
      let kanban: any = null;
      if (!result.data.unique_code || !siteId) {
        const kanbanQuery = supabase
          .from("Kanban")
          .select(`
            is_offer_kanban,
            site_id,
            category_id,
            category:KanbanCategory!category_id(
              id,
              is_internal,
              internal_base_code
            )
          `)
          .eq("id", result.data.kanbanId);
        const kanbanResult =
          typeof (kanbanQuery as any).single === "function"
            ? await (kanbanQuery as any).single()
            : { data: null };
        kanban = kanbanResult?.data || null;
      }

      // Use site_id from kanban if not already set
      if (!siteId && kanban?.site_id) {
        siteId = kanban.site_id;
      }

      // Normalize category (Supabase may return array for joins)
      const rawCategory = kanban?.category as any;
      const category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;

      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore: legacy typing constraint
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      // Generate unique code using atomic sequence (always incremental)
      let uniqueCode = result.data.unique_code;
      let taskType = kanban?.is_offer_kanban ? "OFFERTA" : "LAVORO";
      
      if (siteId && !result.data.unique_code) {
        // Check if kanban belongs to an internal category (e.g., service with code 5000)
        if (category && category.is_internal && category.internal_base_code) {
          uniqueCode = await generateInternalTaskCode(siteId, category.id, category.internal_base_code);
          taskType = "INTERNO";
        } else {
          uniqueCode = await generateTaskCode(siteId, taskType);
        }
      }

      const insertData: any = {
        title: "",
        name: result.data.name,
        luogo: result.data.luogo || null,
        clientId: result.data.clientId!,
        deliveryDate: toDateString(result.data.deliveryDate),
        termine_produzione: toDateString(result.data.termine_produzione),
        unique_code: uniqueCode,
        sellProductId: result.data.productId!,
        kanbanId: result.data.kanbanId,
        kanbanColumnId: targetColumnId,
        sellPrice: result.data.sellPrice,
        numero_pezzi: result.data.numero_pezzi,
        other: result.data.other,
        positions: positions,
        // Link to parent offer if provided
        parent_task_id: result.data.parentTaskId || null,
        // Set task type based on kanban type or internal category
        task_type: taskType,
      };

      if (siteId) {
        insertData.site_id = siteId;
      }

      const taskInsertQuery = supabase.from("Task").insert(insertData);
      const taskInsertResult =
        typeof (taskInsertQuery as any).select === "function"
          ? await (taskInsertQuery as any).select().single()
          : await taskInsertQuery;
      const { data: taskCreate, error: taskCreateError } = taskInsertResult || {};

      if (taskCreateError) {
        console.error("Error creating task:", taskCreateError);
        return {
          error: true,
          message: "Errore nella creazione del task!",
        };
      }

      // Create project folders automatically
      let cloudFolderUrl = null;
      let projectFilesUrl = null;
      if (taskCreate && siteId && uniqueCode) {
        try {
          const folders = await createProjectFolders(
            taskCreate.id,
            uniqueCode,
            siteId
          );
          cloudFolderUrl = folders.cloudFolderUrl;
          projectFilesUrl = folders.projectFilesUrl;

          // Update task with folder URLs if they were created successfully
          if (cloudFolderUrl || projectFilesUrl) {
            await supabase
              .from("Task")
              .update({
                cloud_folder_url: cloudFolderUrl,
                project_files_url: projectFilesUrl,
              })
              .eq("id", taskCreate.id);
          }
        } catch (folderError) {
          console.error("Error creating project folders:", folderError);
          // Don't fail the task creation if folder creation fails
        }
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

      revalidatePath("/projects");
      return taskCreate;
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
