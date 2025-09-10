import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { getSiteData } from "../../../../../lib/fetchers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user from Supabase auth to verify permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, column, columnName } = body;
    const now = new Date();

    // Extract site_id from request headers or domain
    let siteId = null;
    const siteIdFromHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

    if (siteIdFromHeader) {
      siteId = siteIdFromHeader;
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

    console.log("Move card request:", {
      id,
      column,
      columnName,
      userId: user.id,
      siteId,
    });

    // Find task with site_id filtering if available
    let taskQuery = supabase
      .from("Task")
      .select(`
        *,
        kanban_columns:kanbanColumnId(*),
        quality_control:taskId(*),
        packing_control:taskId(*)
      `)
      .eq("id", id);

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error: findError } = await taskQuery.single();

    if (findError || !task) {
      console.error("Task not found:", id);
      return NextResponse.json({ error: "Task not found", status: 404 });
    }

    console.log("Found task:", {
      taskId: task.id,
      currentColumn: task.kanban_columns?.identifier,
    });

    const prevColumn = task?.kanban_columns?.identifier;

    // Get the target column's position
    const { data: targetColumn, error: columnError } = await supabase
      .from("KanbanColumn")
      .select("*")
      .eq("id", column)
      .single();

    if (columnError || !targetColumn) {
      console.error("Target column not found:", column);
      return NextResponse.json({
        error: "Target column not found",
        status: 404,
      });
    }

    console.log("Found target column:", {
      columnId: targetColumn.id,
      columnName: targetColumn.identifier,
    });

    // Get the total number of columns in the kanban to calculate progress percentage
    const countRes = await supabase
      .from("KanbanColumn")
      .select("*", { count: "exact", head: true })
      .eq("kanbanId", task?.kanbanId);

    if (countRes.error) throw countRes.error;

    const totalColumns = countRes.count ?? 0;

    // Calculate progress based on target column position
    // First column (position 1) should always be 0%
    // For other columns, we calculate progress based on their position relative to total columns
    let progress = 0;
    if (
      targetColumn?.position &&
      targetColumn.position > 1 &&
      totalColumns > 1
    ) {
      // Subtract 1 from position and totalColumns to make the calculation start from 0
      // This ensures first column is 0% and last column is 100%
      progress = Math.round(
        ((targetColumn.position - 1) * 100) / (totalColumns - 1),
      );
    }

    // If materials have been added, add 10 and 15 to the new progress value
    if (task!.metalli) {
      progress += 10;
    }
    if (task!.ferramenta) {
      progress += 15;
    }

    // Cap progress at 100%
    progress = Math.min(progress, 100);

    let qcControlResult;
    let packingControlResult;

    //create the packing control and qualityControl objects
    if (columnName === "QCPROD" && task) {
      const { data: qcMasterItems, error: qcMasterError } = await supabase
        .from("QcMasterItems")
        .select("*");

      if (qcMasterError) throw qcMasterError;

      if (task?.quality_control?.length === 0) {
        // Create QualityControl if it doesn't exist
        const qcPromises = task.positions
          .filter((position: any) => position !== "") // Filter out empty positions
          .map(async (position: any) => {
            // Create Quality Control entry
            const { data: qcControl, error: qcControlError } = await supabase
              .from("QualityControl")
              .insert({
                taskId: task.id,
                userId: user.id,
                positionNr: position,
              })
              .select()
              .single();

            if (qcControlError) throw qcControlError;

            // For each standard QC item, create a QC item linked to the new QC entry
            const qcItemPromises = qcMasterItems.map((item) =>
              supabase
                .from("QcItems")
                .insert({
                  name: item.name,
                  qualityControlId: qcControl.id, // Link to the newly created QC entry
                })
            );

            // Return all QC Item creation promises for this particular QC entry
            return Promise.all(qcItemPromises);
          });

        // Execute all promises for QC entries and their items
        qcControlResult = await Promise.all(qcPromises.flat());
      }
    }

    if (columnName === "IMBALLAGGIO" && task) {
      const { data: packingMasterItems, error: packingMasterError } =
        await supabase
          .from("PackingMasterItems")
          .select("*");

      if (packingMasterError) throw packingMasterError;

      if (task?.packing_control?.length === 0) {
        // Create PackingControl if it doesn't exist
        const { data: packingControl, error: packingControlError } =
          await supabase
            .from("PackingControl")
            .insert({
              taskId: task.id,
              userId: user.id,
            })
            .select()
            .single();

        if (packingControlError) throw packingControlError;

        // For each standard packing item, create a packing item linked to the new packing entry
        const packingItemPromises = packingMasterItems.map((item) =>
          supabase
            .from("PackingItems")
            .insert({
              name: item.name,
              packingControlId: packingControl.id, // Link to the newly created packing entry
            })
        );

        // Execute all promises for packing entries and their items
        packingControlResult = await Promise.all(packingItemPromises);
      }
    }

    // Update task with site_id filtering if available
    let updateQuery = supabase
      .from("Task")
      .update({
        kanbanColumnId: column,
        updated_at: now,
        percentStatus: progress,
      })
      .eq("id", id);

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { data: response, error: updateError } = await updateQuery
      .select(`
        *,
        kanban_columns:kanbanColumnId(*)
      `)
      .single();

    if (updateError) throw updateError;

    if (response) {
      // Create a new Action record to track the user action
      const actionData: any = {
        type: "move_task",
        data: {
          taskId: id,
          fromColumn: prevColumn,
          toColumn: response.kanban_columns?.title,
        },
        user_id: user.id,
        task_id: id,
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

      return NextResponse.json({
        data: response,
        history: newAction,
        qc: qcControlResult,
        pc: packingControlResult,
        status: 200,
      });
    }
  } catch (err) {
    console.error("Error in move card API:", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "Unknown error",
      status: 400,
    });
  }
}
