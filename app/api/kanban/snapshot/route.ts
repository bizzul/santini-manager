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
      .from("task_history")
      .select(`
        *,
        tasks:task_id(
          *,
          kanban_columns:column_id(*),
          kanbans:kanban_id(*),
          clients:client_id(*),
          sell_products:sell_product_id(*)
        )
      `)
      .lte("created_at", timestamp)
      .eq("tasks.archived", false) // Only include histories for non-archived tasks
      .order("created_at", { ascending: false });

    if (historyError) throw historyError;

    // Get all current active tasks
    const { data: currentTasks, error: currentError } = await supabase
      .from("tasks")
      .select(`
        *,
        kanban_columns:column_id(*),
        kanbans:kanban_id(*),
        clients:client_id(*),
        sell_products:sell_product_id(*)
      `)
      .eq("archived", false); // Only get non-archived tasks

    if (currentError) throw currentError;

    // Get suppliers for current tasks
    const taskIds = currentTasks.map((task) => task.id);
    const { data: suppliers, error: suppliersError } = await supabase
      .from("task_suppliers")
      .select(`
        *,
        suppliers:supplier_id(*)
      `)
      .in("task_id", taskIds);

    if (suppliersError) throw suppliersError;

    // Get quality control and packing control for current tasks
    const { data: qualityControl, error: qcError } = await supabase
      .from("quality_control")
      .select("*")
      .in("task_id", taskIds);

    if (qcError) throw qcError;

    const { data: packingControl, error: pcError } = await supabase
      .from("packing_control")
      .select("*")
      .in("task_id", taskIds);

    if (pcError) throw pcError;

    // Create a map of tasks from history
    const historicalTasksMap = new Map(
      taskHistories.map((history) => [history.task_id, history.snapshot]),
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
          suppliers: suppliers.filter((s) => s.task_id === task.id),
          quality_control: qualityControl.filter((qc) =>
            qc.task_id === task.id
          ),
          packing_control: packingControl.filter((pc) =>
            pc.task_id === task.id
          ),
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
