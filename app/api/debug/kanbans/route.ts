import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all kanbans
    const { data: kanbans, error: kanbansError } = await supabase
      .from("kanbans")
      .select("*")
      .order("title", { ascending: true });

    if (kanbansError) throw kanbansError;

    // Get all columns for all kanbans
    const { data: columns, error: columnsError } = await supabase
      .from("kanban_columns")
      .select("*")
      .order("position", { ascending: true });

    if (columnsError) throw columnsError;

    // Get all tasks for all kanbans
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, unique_code, title, kanban_id");

    if (tasksError) throw tasksError;

    // Group columns and tasks by kanban_id
    const columnsByKanban = columns.reduce((acc, col: any) => {
      if (!acc[col.kanban_id]) acc[col.kanban_id] = [];
      acc[col.kanban_id].push(col);
      return acc;
    }, {} as Record<string, any[]>);

    const tasksByKanban = tasks.reduce((acc, task: any) => {
      if (!acc[task.kanban_id]) acc[task.kanban_id] = [];
      acc[task.kanban_id].push(task);
      return acc;
    }, {} as Record<string, any[]>);

    // Build the response data
    const dbInfo = {
      kanbanCount: kanbans.length,
      totalColumns: columns.length,
      totalTasks: tasks.length,
      kanbans: kanbans.map((kanban: any) => ({
        id: kanban.id,
        title: kanban.title,
        identifier: kanban.identifier,
        color: kanban.color,
        columnCount: (columnsByKanban[kanban.id] || []).length,
        taskCount: (tasksByKanban[kanban.id] || []).length,
        columns: (columnsByKanban[kanban.id] || []).map((col: any) => ({
          id: col.id,
          title: col.title,
          identifier: col.identifier,
          position: col.position,
        })),
      })),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: dbInfo,
    });
  } catch (error) {
    console.error("Error in debug kanbans API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch debug data",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
