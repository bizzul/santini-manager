import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const GET = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    
    // Get optional siteId from query params
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    // Get ALL columns with identifier "SPEDITO" (there may be multiple across sites)
    // With the new multi-site setup, we need to exclude all SPEDITO columns
    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("id, identifier, kanbanId");

    if (columnsError) throw columnsError;

    // Find all SPEDITO column IDs
    const speditColumns = columns?.filter(col => col.identifier === "SPEDITO") || [];
    const speditColumnIds = speditColumns.map(col => col.id);

    // Build query for tasks that are not archived and not in any SPEDITO column
    let tasksQuery = supabase
      .from("Task")
      .select("*")
      .eq("archived", false);
    
    // Exclude tasks in any SPEDITO column
    if (speditColumnIds.length > 0) {
      // Use not.in instead of neq for multiple IDs
      tasksQuery = tasksQuery.not("kanbanColumnId", "in", `(${speditColumnIds.join(",")})`);
    }
    
    // Filter by site if provided
    if (siteId) {
      tasksQuery = tasksQuery.eq("site_id", siteId);
    }

    const { data: tasks, error: tasksError } = await tasksQuery;

    if (tasksError) throw tasksError;

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
};
