import { createClient } from "../../../../../utils/supabase/server";
import { validation } from "../../../../../validation/task/create"; //? <--- The validation schema
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "../../../../../lib/fetchers";
import { generateTaskCode } from "../../../../../lib/code-generator";

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
      
      let kanban: { id: number; is_offer_kanban: boolean; site_id: string | null } | null = null;
      
      if (providedKanbanId) {
        // Use the provided kanbanId
        const { data: kanbanData, error: kanbanError } = await supabase
          .from("Kanban")
          .select("id, is_offer_kanban, site_id")
          .eq("id", providedKanbanId)
          .single();

        if (kanbanError || !kanbanData) {
          return NextResponse.json({
            error: true,
            message: `Kanban non trovato con ID ${providedKanbanId}: ${kanbanError?.message || "Non trovato"}`,
          }, { status: 404 });
        }
        kanban = kanbanData;
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

      // Generate unique code using atomic sequence (always incremental)
      let uniqueCode = result.data.unique_code;
      if (siteId) {
        const taskType = kanban?.is_offer_kanban ? "OFFERTA" : "LAVORO";
        uniqueCode = await generateTaskCode(siteId, taskType);
      }

      // Determine task type
      const taskType = body.task_type || (kanban?.is_offer_kanban ? "OFFERTA" : "LAVORO");

      // Prepare insert data with site_id
      const insertData: any = {
        title: "",
        clientId: result.data.clientId,
        deliveryDate: result.data.deliveryDate instanceof Date 
          ? result.data.deliveryDate.toISOString() 
          : result.data.deliveryDate || null,
        termine_produzione: result.data.termine_produzione instanceof Date
          ? result.data.termine_produzione.toISOString()
          : result.data.termine_produzione || null,
        unique_code: uniqueCode,
        sellProductId: result.data.productId,
        name: result.data.name,
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

      const { data: taskCreate, error: taskError } = await supabase
        .from("Task")
        .insert(insertData)
        .select()
        .single();

      if (taskError) {
        return NextResponse.json({
          error: true,
          message: `Errore nella creazione del task: ${taskError.message}`,
        }, { status: 500 });
      }

      // Success
      if (taskCreate) {
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
