import { createClient } from "../../../../../utils/supabase/server";
import { validation } from "../../../../../validation/task/create"; //? <--- The validation schema
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "../../../../../lib/fetchers";

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
      // Get kanban and column IDs (filter by site_id if available)
      let kanbanQuery = supabase
        .from("Kanban")
        .select("id")
        .eq("identifier", "PRODUCTION");

      if (siteId) {
        kanbanQuery = kanbanQuery.eq("site_id", siteId);
      }

      const { data: kanban, error: kanbanError } = await kanbanQuery.single();

      if (kanbanError) throw kanbanError;

      const { data: column, error: columnError } = await supabase
        .from("KanbanColumn")
        .select("id")
        .eq("identifier", "TODOPROD")
        .eq("kanbanId", kanban.id)
        .single();

      if (columnError) throw columnError;

      // create an array of positions from the request body
      // if a position is not provided, it defaults to an empty string
      const positions = Array.from(
        { length: 8 },
        //@ts-ignore
        (_, i) => result.data[`position${i + 1}`] || "",
      );

      // Prepare insert data with site_id
      const insertData: any = {
        title: "",
        clientId: result.data.clientId,
        deliveryDate: result.data.deliveryDate,
        unique_code: result.data.unique_code,
        sellProductId: result.data.productId,
        name: result.data.name,
        kanbanId: kanban.id,
        kanbanColumnId: column.id,
        sellPrice: result.data.sellPrice,
        other: result.data.other,
        positions: positions,
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

      if (taskError) throw taskError;

      // Success
      if (taskCreate) {
        if (body.fileIds !== null) {
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

        return NextResponse.json({ taskCreate, status: 200 });
      } else {
        return NextResponse.json({ error: result, status: 500 });
      }
    } else {
      //Input invalid
      return NextResponse.json({ error: "Error", status: 400 });
    }
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
