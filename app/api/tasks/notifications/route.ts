import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    // First get all columns to find the SPEDITO column ID
    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("id, identifier")
      .eq("identifier", "SPEDITO");

    if (columnsError) throw columnsError;

    const speditColumnId = columns?.[0]?.id;

    // Get tasks that are not archived and not in SPEDITO column
    const { data: tasks, error: tasksError } = await supabase
      .from("Task")
      .select("*")
      .eq("archived", false)
      .neq("kanbanColumnId", speditColumnId);

    if (tasksError) throw tasksError;

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
