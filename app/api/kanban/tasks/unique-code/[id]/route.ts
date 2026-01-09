import { createClient } from "../../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSiteContext } from "@/lib/site-context";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;

  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);

    // Build query for task by unique_code
    let taskQuery = supabase
      .from("Task")
      .select(`
        *,
        kanbans:kanbanId(*),
        clients:clientId(*),
        users:userId(*),
        kanban_columns:kanbanColumnId(*),
        sell_products:sellProductId(*)
      `)
      .eq("unique_code", taskId);

    // Filter by site_id if available (required for multi-tenant)
    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error } = await taskQuery.single();

    if (error) throw error;

    if (task) {
      return NextResponse.json({ client: task, status: 200 });
    } else {
      return NextResponse.json({ message: "Task not found", status: 404 });
    }
  } catch (error) {
    logger.error("Error fetching task:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}
