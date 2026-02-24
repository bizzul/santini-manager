import { createClient } from "../../../../../utils/supabase/server";
import { validation } from "../../../../../validation/task/create"; //? <--- The validation schema
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "../../../../../lib/fetchers";
import { generateTaskCode, generateInternalTaskCode } from "../../../../../lib/code-generator";
import { createProjectFolders } from "../../../../../lib/project-folders";
import { formatLocalDate } from "../../../../../lib/utils";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = validation.safeParse(body); //? <---Veryfing body against validation schema

    // Extract site_id from request headers or body
    let siteId = null;
    const siteIdFromHeader = req.headers.get("x-site-id");
    const siteIdFromBody = body.siteId;
    const domain = req.headers.get("host");

    if (siteIdFromHeader) {
      siteId = siteIdFromHeader;
    } else if (siteIdFromBody) {
      siteId = siteIdFromBody;
    } else if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    if (result.success) {
      // Check if a specific kanbanId was provided
      const providedKanbanId = body.kanbanId || result.data.kanbanId;
      
      let kanban: { 
        id: number; 
        is_offer_kanban: boolean; 
        site_id: string | null;
        category_id?: number | null;
        category?: { id: number; is_internal: boolean; internal_base_code: number | null } | null;
      } | null = null;
      
      // Track internal category info
      let isInternalCategory = false;
      let internalCategoryId: number | null = null;
      let internalBaseCode: number | null = null;
      
      if (providedKanbanId) {
        // Use the provided kanbanId - include category info
        const { data: kanbanData, error: kanbanError } = await supabase
          .from("Kanban")
          .select(`
            id, 
            is_offer_kanban, 
            site_id,
            category_id,
            category:KanbanCategory!category_id(
              id,
              is_internal,
              internal_base_code
            )
          `)
          .eq("id", providedKanbanId)
          .single();

        if (kanbanError || !kanbanData) {
          return NextResponse.json({
            error: true,
            message: `Kanban non trovato con ID ${providedKanbanId}: ${kanbanError?.message || "Non trovato"}`,
          }, { status: 404 });
        }
        
        // Normalize category (Supabase may return array for joins)
        const rawCategory = kanbanData.category as any;
        const normalizedCategory = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory;
        
        kanban = {
          id: kanbanData.id,
          is_offer_kanban: kanbanData.is_offer_kanban,
          site_id: kanbanData.site_id,
          category_id: kanbanData.category_id,
          category: normalizedCategory || null,
        };
        
        // Check if kanban belongs to an internal category
        if (normalizedCategory && normalizedCategory.is_internal && normalizedCategory.internal_base_code) {
          isInternalCategory = true;
          internalCategoryId = normalizedCategory.id;
          internalBaseCode = normalizedCategory.internal_base_code;
        }
      } else {
        // Fallback: Get default PRODUCTION kanban (filter by site_id if available)
        let kanbanQuery = supabase
          .from("Kanban")
          .select("id, is_offer_kanban, site_id")
          .eq("identifier", "PRODUCTION");

        if (siteId) {
          kanbanQuery = kanbanQuery.eq("site_id", siteId);
        }

        const { data: kanbanData, error: kanbanError } = await kanbanQuery.single();

        if (kanbanError || !kanbanData) {
          return NextResponse.json({
            error: true,
            message: `Kanban PRODUCTION non trovato: ${kanbanError?.message || "Non trovato"}`,
          }, { status: 404 });
        }
        kanban = kanbanData;
      }

      // Use site_id from kanban if not already set
      if (!siteId && kanban?.site_id) {
        siteId = kanban.site_id;
      }

      // Get the first column of the kanban (order by position)
      const { data: column, error: columnError } = await supabase
        .from("KanbanColumn")
        .select("id")
        .eq("kanbanId", kanban.id)
        .order("position", { ascending: true })
        .limit(1)
        .single();

      if (columnError || !column) {
        return NextResponse.json({
          error: true,
          message: `Colonna kanban non trovata: ${columnError?.message || "Nessuna colonna"}`,
        }, { status: 404 });
      }

      // create an array of positions from the request body
      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      // Determine task type - internal categories use "INTERNO"
      let taskType: string;
      if (isInternalCategory) {
        taskType = "INTERNO";
      } else {
        taskType = body.task_type || (kanban?.is_offer_kanban ? "OFFERTA" : "LAVORO");
      }

      // Generate unique code using atomic sequence (always incremental)
      // Retry logic in case of duplicate key error
      let uniqueCode = result.data.unique_code;
      let taskCreate: any = null;
      let taskError: any = null;
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries && !taskCreate) {
        // Generate new code if siteId exists (always regenerate to ensure uniqueness)
        if (siteId) {
          // Use internal code generator for internal categories
          if (isInternalCategory && internalCategoryId && internalBaseCode) {
            uniqueCode = await generateInternalTaskCode(siteId, internalCategoryId, internalBaseCode);
          } else {
            uniqueCode = await generateTaskCode(siteId, taskType);
          }
        }

        // Prepare insert data with site_id
        const insertData: any = {
          title: "",
          clientId: result.data.clientId,
          deliveryDate: result.data.deliveryDate instanceof Date 
            ? formatLocalDate(result.data.deliveryDate) 
            : result.data.deliveryDate || null,
          termine_produzione: result.data.termine_produzione instanceof Date
            ? formatLocalDate(result.data.termine_produzione)
            : result.data.termine_produzione || null,
          unique_code: uniqueCode,
          sellProductId: result.data.productId,
          name: result.data.name,
          luogo: result.data.luogo || null,
          kanbanId: kanban.id,
          kanbanColumnId: column.id,
          sellPrice: result.data.sellPrice,
          numero_pezzi: result.data.numero_pezzi || null,
          other: result.data.other,
          positions: positions,
          // Draft and task type fields
          is_draft: result.data.isDraft || false,
          task_type: taskType,
          // Category IDs for draft offers (used to filter products when completing)
          draft_category_ids: result.data.draftCategoryIds || null,
        };

        // Add site_id if available
        if (siteId) {
          insertData.site_id = siteId;
        }

        const { data: createdTask, error: error } = await supabase
          .from("Task")
          .insert(insertData)
          .select()
          .single();

        taskError = error;
        
        // Check if error is a duplicate key constraint violation (case-insensitive check)
        if (error && error.code === "23505" && error.message?.toLowerCase().includes("task_site_unique_code_key")) {
          // Duplicate key error - retry with a new code
          retryCount++;
          if (retryCount < maxRetries) {
            // Wait a bit before retrying to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
            continue;
          }
        } else if (error) {
          // Other error - break and return
          break;
        } else {
          // Success
          taskCreate = createdTask;
          break;
        }
      }

      if (taskError && !taskCreate) {
        return NextResponse.json({
          error: true,
          message: `Errore nella creazione del task: ${taskError.message}`,
        }, { status: 500 });
      }

      // Success
      if (taskCreate) {
        // Create project folders automatically
        if (siteId && uniqueCode) {
          try {
            const folders = await createProjectFolders(
              taskCreate.id,
              uniqueCode,
              siteId
            );
            
            // Update task with folder URLs if they were created successfully
            if (folders.cloudFolderUrl || folders.projectFilesUrl) {
              await supabase
                .from("Task")
                .update({
                  cloud_folder_url: folders.cloudFolderUrl,
                  project_files_url: folders.projectFilesUrl,
                })
                .eq("id", taskCreate.id);
            }
          } catch (folderError) {
            console.error("Error creating project folders:", folderError);
            // Don't fail the task creation if folder creation fails
          }
        }

        if (body.fileIds && Array.isArray(body.fileIds) && body.fileIds.length > 0) {
          // Save the Cloudinary IDs of the uploaded files to the task record
          await Promise.all(
            body.fileIds.map((fileId: number) => {
              return supabase
                .from("files")
                .update({ task_id: taskCreate.id })
                .eq("id", fileId);
            }),
          );
        }

        // Create a new Action record to track the user action
        const actionData: any = {
          type: "task_create",
          data: {
            task: taskCreate.id,
          },
          user_id: user.id,
          task_id: taskCreate.id,
        };

        // Add site_id if available
        if (siteId) {
          actionData.site_id = siteId;
        }

        const { data: newAction, error: actionError } = await supabase
          .from("Action")
          .insert(actionData)
          .select()
          .single();

        if (actionError) {
          console.error("Error creating action:", actionError);
        }

        return NextResponse.json({ data: taskCreate, status: 200 });
      } else {
        return NextResponse.json({ error: result, status: 500 });
      }
    } else {
      //Input invalid
      const errorMessages = result.error.issues.map((issue) => issue.message)
        .join(", ");
      return NextResponse.json({
        error: true,
        message: `Dati non validi: ${errorMessages}`,
        issues: result.error.issues,
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({
      error: true,
      message: error instanceof Error
        ? error.message
        : "Errore sconosciuto durante la creazione del task",
    }, { status: 500 });
  }
}
