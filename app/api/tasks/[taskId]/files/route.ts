import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createClient();
    const { taskId: taskIdParam } = await params;
    const taskId = parseInt(taskIdParam);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID" },
        { status: 400 }
      );
    }

    const { data: files, error } = await supabase
      .from("File")
      .select("*")
      .eq("taskId", taskId)
      .order("id", { ascending: false });

    if (error) {
      logger.error("Error fetching task files:", error);
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 }
      );
    }

    return NextResponse.json(files || []);
  } catch (error) {
    logger.error("Error in task files API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
