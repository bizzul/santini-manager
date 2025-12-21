import { createClient } from "../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "../../../../../lib/fetchers";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;
  try {
    const supabase = await createClient();

    // Extract site_id from request headers or domain
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
        logger.error("Error fetching site data:", error);
      }
    }

    // Fetch a single task (filter by site_id if available)
    let taskQuery = supabase
      .from("Task")
      .select(`
        *,
        kanbans:kanbanId(*),
        clients:clientId(*),
        users:userId(*),
        kanban_columns:kanbanColumnId(*),
        files(*),
        sell_products:sellProductId(*)
      `)
      .eq("id", Number(taskId));

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error } = await taskQuery.single();

    if (error) throw error;

    // console.log("project", task);
    if (task) {
      return NextResponse.json({ task, status: 200 });
    } else {
      return NextResponse.json({ message: "Task not found", status: 404 });
    }
  } catch (error) {
    logger.error("Error fetching task:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  
  try {
    const supabase = await createClient();
    const body = await req.json();

    // Extract site_id from request headers or domain
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
        logger.error("Error fetching site data:", error);
      }
    }

    // Verify task exists (filter by site_id if available)
    let taskQuery = supabase
      .from("Task")
      .select("*")
      .eq("id", Number(taskId));

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const { data: task, error: findError } = await taskQuery.single();

    if (findError) throw findError;

    if (!task) {
      return NextResponse.json({
        message: "The task does not exist.",
        status: 404,
      });
    }

    // Build update object from allowed fields
    const updateData: Record<string, any> = {};
    
    // List of allowed fields to update
    const allowedFields = [
      'unique_code', 'title', 'name', 'description',
      'clientId', 'sellProductId', 'sellPrice',
      'deliveryDate', 'termine_produzione',
      'other', 'positions', 'numero_pezzi',
      'kanbanColumnId', 'kanbanId',
      'is_draft', 'task_type', 'display_mode',
      'material', 'metalli', 'ferramenta', 'legno', 'vernice', 'altro', 'stoccato',
      'percent_status', 'archived', 'parent_task_id'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const { data: taskData, error: updateError } = await supabase
      .from("Task")
      .update(updateData)
      .eq("id", Number(taskId))
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      stato: "UPDATED",
      task: taskData,
      status: 200,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const taskId = await req.json();

    const { data: task, error: findError } = await supabase
      .from("Task")
      .select("*")
      .eq("id", Number(taskId))
      .single();

    if (findError) throw findError;

    if (task) {
      //Removing task
      const { error: deleteError } = await supabase
        .from("Task")
        .delete()
        .eq("id", Number(taskId));

      if (deleteError) throw deleteError;

      return NextResponse.json({
        stato: "DELETED",
        task: task,
        status: 200,
      });
    }

    return NextResponse.json({
      message: "The task id does not exist.",
      status: 404,
    });
  } catch (error) {
    logger.error("Error deleting task:", error);
    return NextResponse.json({ message: "Internal server error", status: 500 });
  }
}
