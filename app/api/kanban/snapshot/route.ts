import { createClient } from "../../../../utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const timestamp = new Date(searchParams.get("timestamp") || "");

    // First get all tasks that existed at that time
    const { data: taskHistories, error: historyError } = await supabase
      .from("TaskHistory")
      .select(`
        *,
        tasks:taskId(
          *,
          kanban_columns:kanbanColumnId(*),
          kanbans:kanbanId(*),
          clients:clientId(*),
          sell_products:sellProductId(*)
        )
      `)
      .lte("created_at", timestamp)
      .eq("tasks.archived", false) // Only include histories for non-archived tasks
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    // Get all current active tasks
    const { data: currentTasks, error: currentError } = await supabase
      .from("Task")
      .select(`
        *,
        kanban_columns:kanbanColumnId(*),
        kanbans:kanbanId(*),
        clients:clientId(*),
        sell_products:sellProductId(*)
      `)
      .eq("archived", false); // Only get non-archived tasks

    if (currentError) throw currentError;

    // Get suppliers for current tasks
    const taskIds = currentTasks.map((task) => task.id);
    const { data: suppliers, error: suppliersError } = await supabase
      .from("TaskSuppliers")
      .select(`
        *,
        suppliers:supplierId(*)
      `)
      .in("taskId", taskIds);

    if (suppliersError) throw suppliersError;

    // Get quality control and packing control for current tasks
    const { data: qualityControl, error: qcError } = await supabase
      .from("QualityControl")
      .select("*")
      .in("taskId", taskIds);

    if (qcError) throw qcError;

    const { data: packingControl, error: pcError } = await supabase
      .from("PackingControl")
      .select("*")
      .in("taskId", taskIds);

    if (pcError) throw pcError;

    // Create a map of tasks from history
    const historicalTasksMap = new Map(
      taskHistories.map((history) => [history.taskId, history.snapshot]),
    );

    // Combine historical and current tasks
    const tasksAtTimestamp = currentTasks
      .map((task) => {
        const historicalVersion = historicalTasksMap.get(task.id);
        if (historicalVersion) {
          // Check if the historical version was archived
          if ((historicalVersion as any).archived) {
            return null; // Skip archived tasks
          }
          return {
            //@ts-ignore
            ...historicalVersion,
            //@ts-ignore
            column_id: historicalVersion.kanbanColumnId,
            //@ts-ignore
            kanban_id: historicalVersion.kanbanId,
            //@ts-ignore
            column_position: historicalVersion.column_position,
            //@ts-ignore
            kanban_columns: historicalVersion.column,
            //@ts-ignore
            kanbans: historicalVersion.kanban,
            isPreview: true,
          };
        }
        // If no historical version exists, use current task
        return {
          ...task,
          suppliers: suppliers.filter((s) => s.taskId === task.id),
          quality_control: qualityControl.filter((qc) => qc.taskId === task.id),
          packing_control: packingControl.filter((pc) => pc.taskId === task.id),
          isPreview: true,
        };
      })
      .filter(Boolean); // Remove null entries (archived tasks)

    return NextResponse.json(tasksAtTimestamp);
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshot" },
      { status: 500 },
    );
  }
}
