import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";

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

    console.log("Move card request:", {
      id,
      column,
      columnName,
      userId: user.id,
    });

    const { data: task, error: findError } = await supabase
      .from("tasks")
      .select(`
        *,
        kanban_columns:column_id(*),
        quality_control:task_id(*),
        packing_control:task_id(*)
      `)
      .eq("id", id)
      .single();

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
      .from("kanban_columns")
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
      .from("kanban_columns")
      .select("*", { count: "exact", head: true })
      .eq("kanban_id", task?.kanban_id);

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
        .from("qc_master_items")
        .select("*");

      if (qcMasterError) throw qcMasterError;

      if (task?.quality_control?.length === 0) {
        // Create QualityControl if it doesn't exist
        const qcPromises = task.positions
          .filter((position: any) => position !== "") // Filter out empty positions
          .map(async (position: any) => {
            // Create Quality Control entry
            const { data: qcControl, error: qcControlError } = await supabase
              .from("quality_control")
              .insert({
                task_id: task.id,
                user_id: user.id,
                position_nr: position,
              })
              .select()
              .single();

            if (qcControlError) throw qcControlError;

            // For each standard QC item, create a QC item linked to the new QC entry
            const qcItemPromises = qcMasterItems.map((item) =>
              supabase
                .from("qc_items")
                .insert({
                  name: item.name,
                  quality_control_id: qcControl.id, // Link to the newly created QC entry
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
          .from("packing_master_items")
          .select("*");

      if (packingMasterError) throw packingMasterError;

      if (task?.packing_control?.length === 0) {
        // Create PackingControl if it doesn't exist
        const { data: packingControl, error: packingControlError } =
          await supabase
            .from("packing_control")
            .insert({
              task_id: task.id,
              user_id: user.id,
            })
            .select()
            .single();

        if (packingControlError) throw packingControlError;

        // For each standard packing item, create a packing item linked to the new packing entry
        const packingItemPromises = packingMasterItems.map((item) =>
          supabase
            .from("packing_items")
            .insert({
              name: item.name,
              packing_control_id: packingControl.id, // Link to the newly created packing entry
            })
        );

        // Execute all promises for packing entries and their items
        packingControlResult = await Promise.all(packingItemPromises);
      }
    }

    const { data: response, error: updateError } = await supabase
      .from("tasks")
      .update({
        column_id: column,
        updated_at: now,
        percent_status: progress,
      })
      .eq("id", id)
      .select(`
        *,
        kanban_columns:column_id(*)
      `)
      .single();

    if (updateError) throw updateError;

    if (response) {
      // Create a new Action record to track the user action
      const { data: newAction, error: actionError } = await supabase
        .from("actions")
        .insert({
          type: "move_task",
          data: {
            taskId: id,
            fromColumn: prevColumn,
            toColumn: response.kanban_columns?.title,
          },
          user_id: user.id,
          task_id: id,
        })
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
