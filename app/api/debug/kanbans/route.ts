import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all kanbans
    const { data: kanbans, error: kanbansError } = await supabase
      .from("Kanban")
      .select("*")
      .order("title", { ascending: true });

    if (kanbansError) throw kanbansError;

    // Get all columns for all kanbans
    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("*")
      .order("position", { ascending: true });

    if (columnsError) throw columnsError;

    // Get all tasks for all kanbans
    const { data: tasks, error: tasksError } = await supabase
      .from("Task")
      .select("id, unique_code, title, kanbanId");

    if (tasksError) throw tasksError;

    // Group columns and tasks by kanbanId
    const columnsByKanban = columns.reduce((acc, col: any) => {
      if (!acc[col.kanbanId]) acc[col.kanbanId] = [];
      acc[col.kanbanId].push(col);
      return acc;
    }, {} as Record<string, any[]>);

    const tasksByKanban = tasks.reduce((acc, task: any) => {
      if (!acc[task.kanbanId]) acc[task.kanbanId] = [];
      acc[task.kanbanId].push(task);
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
