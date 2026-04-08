import { createClient } from "../../../../../utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getSiteData } from "../../../../../lib/fetchers";
import { logger } from "@/lib/logger";
import { toDateString } from "@/lib/utils";

const TIMETRACKING_SELECT_WITH_USER =
  "id, task_id, user_id, employee_id, totalTime, hours, minutes";
const TIMETRACKING_SELECT_NO_USER =
  "id, task_id, employee_id, totalTime, hours, minutes";

function shouldRetryTimetrackingWithoutUserId(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  const message = maybeError.message || "";
  return (
    maybeError.code === "42703" &&
    (message.includes("Timetracking.user_id") || message.includes("user_id"))
  );
}

function deriveInitials(fullName: string): string {
  const parts = fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "CL";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function resolveEntryHours(entry: {
  totalTime?: unknown;
  hours?: unknown;
  minutes?: unknown;
}): number {
  const totalTime = Number(entry.totalTime);
  if (Number.isFinite(totalTime) && totalTime > 0) {
    return totalTime;
  }
  const hours = Number(entry.hours || 0);
  const minutes = Number(entry.minutes || 0);
  return (Number.isFinite(hours) ? hours : 0) + (Number.isFinite(minutes) ? minutes : 0) / 60;
}

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
        sell_products:sellProductId(*)
      `)
      .eq("id", Number(taskId));

    if (siteId) {
      taskQuery = taskQuery.eq("site_id", siteId);
    }

    const runTimetrackingQuery = async (selectFields: string) => {
      let query = supabase
        .from("Timetracking")
        .select(selectFields)
        .eq("task_id", Number(taskId));

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      return query;
    };

    const timetrackingPromise = (async () => {
      let result = await runTimetrackingQuery(TIMETRACKING_SELECT_WITH_USER);
      if (
        result.error &&
        shouldRetryTimetrackingWithoutUserId(result.error)
      ) {
        logger.warn(
          "Timetracking.user_id not available, retrying query without user_id"
        );
        result = await runTimetrackingQuery(TIMETRACKING_SELECT_NO_USER);
      }
      return result;
    })();

    const [
      { data: task, error },
      { data: files, error: filesError },
      { data: timetracking, error: timetrackingError },
    ] =
      await Promise.all([
        taskQuery.single(),
        supabase.from("File").select("*").eq("taskId", Number(taskId)),
        timetrackingPromise,
      ]);

    if (error) throw error;
    if (filesError) throw filesError;
    if (timetrackingError) throw timetrackingError;

    const trackedUserIds = Array.from(
      new Set(
        (timetracking || [])
          .map((entry: any) => entry.employee_id || entry.user_id)
          .filter(Boolean)
          .map((value: string | number) => String(value)),
      ),
    );

    const userProfilesResult =
      trackedUserIds.length > 0
        ? await supabase
            .from("User")
            .select("id, given_name, family_name, picture, initials, color, email")
            .in("id", trackedUserIds)
        : { data: [], error: null };

    if (userProfilesResult.error) {
      throw userProfilesResult.error;
    }

    const userProfileMap = new Map(
      (userProfilesResult.data || []).map((profile: any) => [String(profile.id), profile]),
    );

    const collaboratorMap = (timetracking || []).reduce<
      Map<
        string,
        {
          id: string;
          name: string;
          initials: string;
          picture: string | null;
          color: string | null;
          hours: number;
          entries: number;
        }
      >
    >((map, entry: any) => {
      const collaboratorId = String(entry.employee_id || entry.user_id || "");
      if (!collaboratorId) return map;
      const rawUser = userProfileMap.get(collaboratorId);

      const fullName =
        `${rawUser?.given_name || ""} ${rawUser?.family_name || ""}`.trim() ||
        rawUser?.email ||
        "Collaboratore";
      const current = map.get(collaboratorId) || {
        id: collaboratorId,
        name: fullName,
        initials: rawUser?.initials || deriveInitials(fullName),
        picture: rawUser?.picture || null,
        color: rawUser?.color || null,
        hours: 0,
        entries: 0,
      };

      current.hours += resolveEntryHours(entry);
      current.entries += 1;
      map.set(collaboratorId, current);
      return map;
    }, new Map());

    const collaboratorTimeSummaries = Array.from(collaboratorMap.values())
      .map((summary) => ({
        ...summary,
        hours: Math.round((summary.hours + Number.EPSILON) * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours);

    // console.log("project", task);
    if (task) {
      return NextResponse.json({
        task: {
          ...task,
          files: files || [],
          collaboratorTimeSummaries,
        },
        status: 200,
      });
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
      'unique_code', 'title', 'name', 'luogo', 'description',
      'clientId', 'sellProductId', 'sellPrice',
      'deliveryDate', 'termine_produzione', 'offer_send_date',
      'ora_inizio', 'ora_fine', 'squadra',
      'other', 'positions', 'numero_pezzi',
      'kanbanColumnId', 'kanbanId',
      'is_draft', 'task_type', 'display_mode',
      'material', 'metalli', 'ferramenta', 'legno', 'vernice', 'altro', 'stoccato',
      'percent_status', 'archived', 'parent_task_id',
      'draft_category_ids', 'offer_products', 'offer_followups',
      'offer_loss_reason', 'offer_loss_competitor_name'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Convert date fields to YYYY-MM-DD string format to avoid timezone issues
        if (
          field === 'deliveryDate' ||
          field === 'termine_produzione' ||
          field === 'offer_send_date'
        ) {
          updateData[field] = toDateString(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (body.offerSendDate !== undefined && updateData.offer_send_date === undefined) {
      updateData.offer_send_date = toDateString(body.offerSendDate);
    }
    if (body.offerProducts !== undefined && updateData.offer_products === undefined) {
      updateData.offer_products = body.offerProducts;
    }
    if (body.offerFollowups !== undefined && updateData.offer_followups === undefined) {
      updateData.offer_followups = body.offerFollowups;
    }
    if (body.offerLossReason !== undefined && updateData.offer_loss_reason === undefined) {
      updateData.offer_loss_reason = body.offerLossReason;
    }
    if (
      body.offerLossCompetitorName !== undefined &&
      updateData.offer_loss_competitor_name === undefined
    ) {
      updateData.offer_loss_competitor_name = body.offerLossCompetitorName;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const runUpdate = async (payload: Record<string, any>) =>
      supabase
        .from("Task")
        .update(payload)
        .eq("id", Number(taskId))
        .select()
        .single();

    let { data: taskData, error: updateError } = await runUpdate(updateData);

    if (
      updateError &&
      (updateError.code === "42703" ||
        updateError.message?.includes("offer_send_date") ||
        updateError.message?.includes("offer_products") ||
        updateError.message?.includes("offer_followups") ||
        updateError.message?.includes("offer_loss_reason") ||
        updateError.message?.includes("offer_loss_competitor_name"))
    ) {
      delete updateData.offer_send_date;
      delete updateData.offer_products;
      delete updateData.offer_followups;
      delete updateData.offer_loss_reason;
      delete updateData.offer_loss_competitor_name;
      ({ data: taskData, error: updateError } = await runUpdate(updateData));
    }

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
