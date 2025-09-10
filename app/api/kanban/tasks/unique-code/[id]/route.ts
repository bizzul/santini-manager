import { createClient } from "../../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;

  try {
    const supabase = await createClient();

    // Fetch a single task with related data
    const { data: task, error } = await supabase
      .from("Task")
      .select(`
        *,
        kanbans:kanbanId(*),
        clients:clientId(*),
        users:userId(*),
        kanban_columns:kanbanColumnId(*),
        sell_products:sellProductId(*)
      `)
      .eq("unique_code", taskId)
      .single();

    if (error) throw error;

    // console.log("project", task);
    if (task) {
      return NextResponse.json({ client: task, status: 200 });
    } else {
      return NextResponse.json({ message: "Client not found", status: 404 });
    }
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}
