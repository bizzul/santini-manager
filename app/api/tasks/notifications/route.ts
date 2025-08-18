import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export const GET = async () => {
  try {
    const supabase = await createClient();

    // First get all columns to find the SPEDITO column ID
    const { data: columns, error: columnsError } = await supabase
      .from("kanban_columns")
      .select("id, identifier")
      .eq("identifier", "SPEDITO");

    if (columnsError) throw columnsError;

    const speditColumnId = columns?.[0]?.id;

    // Get tasks that are not archived and not in SPEDITO column
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("archived", false)
      .neq("column_id", speditColumnId);

    if (tasksError) throw tasksError;

    return NextResponse.json(tasks);
  } catch (err: any) {
    return NextResponse.json(err.message);
  }
};
