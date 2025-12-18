import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";
import { logger } from "@/lib/logger";

// POST - Add a note to a task
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createClient();
    const { taskId } = await params;

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { note, contactType, contactDate } = body;

    if (!note) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    // Extract site_id from request headers
    let siteId = null;
    const siteIdFromHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

    if (siteIdFromHeader) {
      siteId = siteIdFromHeader;
    } else if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Verify the task exists and belongs to this site
    let taskQuery = supabase
      .from("Task")
      .select("id, other")
      .eq("id", parseInt(taskId));

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error: taskError } = await taskQuery.single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Append the note to the task's "other" field
    // The "other" field is used for additional notes/comments
    const existingNotes = task.other || "";
    const separator = existingNotes ? "\n---\n" : "";
    const updatedNotes = `${existingNotes}${separator}${note}`;

    // Update the task with the new note
    let updateQuery = supabase
      .from("Task")
      .update({
        other: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(taskId));

    if (siteId) {
      updateQuery = updateQuery.eq("site_id", siteId);
    }

    const { data: updatedTask, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating task with note:", updateError);
      return NextResponse.json(
        { error: "Failed to save note" },
        { status: 500 }
      );
    }

    // Also create an Action record to track this
    const actionData: any = {
      type: "add_note",
      data: {
        taskId: parseInt(taskId),
        note: note,
        contactType: contactType || null,
        contactDate: contactDate || null,
      },
      user_id: user.id,
      taskId: parseInt(taskId),
    };

    if (siteId) {
      actionData.site_id = siteId;
    }

    await supabase.from("Action").insert(actionData);

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (err) {
    logger.error("Error in add note API:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET - Get notes for a task
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const supabase = await createClient();
    const { taskId } = await params;

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract site_id from request headers
    let siteId = null;
    const siteIdFromHeader = req.headers.get("x-site-id");
    const domain = req.headers.get("host");

    if (siteIdFromHeader) {
      siteId = siteIdFromHeader;
    } else if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Get the task's notes
    let taskQuery = supabase
      .from("Task")
      .select("id, other")
      .eq("id", parseInt(taskId));

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error: taskError } = await taskQuery.single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      notes: task.other || "",
    });
  } catch (err) {
    logger.error("Error in get notes API:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

