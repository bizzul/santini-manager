import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { name, url, storage_path, taskId, sellProductId, errortrackingId } = body;

    if (!name || !url || !storage_path) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const insertData: {
      name: string;
      url: string;
      storage_path: string;
      taskId?: number;
      sellProductId?: number;
      errortrackingId?: number;
    } = {
      name,
      url,
      storage_path,
    };

    if (taskId) {
      insertData.taskId = taskId;
    }

    if (sellProductId) {
      insertData.sellProductId = sellProductId;
    }

    if (errortrackingId) {
      insertData.errortrackingId = errortrackingId;
    }

    const { data: result, error } = await supabase
      .from("File")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result, status: 200 });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
