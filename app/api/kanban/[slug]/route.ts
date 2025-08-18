import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: filteredKanban } = await params;
  try {
    const supabase = await createClient();

    // First get the kanban
    const { data: kanban, error: kanbanError } = await supabase
      .from("Kanban")
      .select("*")
      .eq("identifier", filteredKanban)
      .single();

    if (kanbanError) {
      console.error("Error fetching kanban:", kanbanError);
      return NextResponse.json({ error: "Kanban not found" }, { status: 404 });
    }

    // Then get the columns for this kanban
    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("*")
      .eq("kanbanId", kanban.id)
      .order("position", { ascending: true });

    if (columnsError) {
      console.error("Error fetching columns:", columnsError);
      return NextResponse.json({ error: "Failed to fetch columns" }, {
        status: 500,
      });
    }

    // Return kanban with columns
    return NextResponse.json({
      ...kanban,
      columns: columns || [],
    });
  } catch (error) {
    console.error("Error in kanban API:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
