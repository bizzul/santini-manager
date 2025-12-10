import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kanbanId: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const kanbanId = parseInt(resolvedParams.kanbanId);

    console.log("📡 API: Fetching columns for kanban ID:", kanbanId);

    if (isNaN(kanbanId)) {
      logger.error("❌ Invalid kanban ID:", resolvedParams.kanbanId);
      return NextResponse.json(
        { error: "Invalid kanban ID" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("KanbanColumn")
      .select("*")
      .eq("kanbanId", kanbanId)
      .order("position");

    if (error) {
      console.error("❌ Error fetching kanban columns:", error);
      return NextResponse.json(
        { error: "Failed to fetch columns", details: error.message },
        { status: 500 }
      );
    }

    logger.debug(`✅ Found ${data?.length || 0} columns for kanban ${kanbanId}`);
    return NextResponse.json(data || []);
  } catch (error) {
    logger.error("❌ Error in kanban columns route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

