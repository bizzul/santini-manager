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

    const { data: history, error } = await supabase
      .from("Action")
      .select("*, User(id, picture, given_name, family_name)")
      .eq("taskId", taskId)
      .order("createdAt", { ascending: false });

    if (error) {
      logger.error("Error fetching task history:", error);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    return NextResponse.json(history || []);
  } catch (error) {
    logger.error("Error in task history API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
