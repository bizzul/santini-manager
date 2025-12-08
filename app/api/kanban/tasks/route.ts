import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.scope("KanbanTasks");

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);

    // In multi-tenant, siteId is required
    if (!siteId) {
      log.warn("KanbanTasks API called without siteId");
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 },
      );
    }

    log.debug("Fetching kanban tasks", { siteId });

    // PHASE 1: Parallel fetch of kanbans and tasks with direct site filter
    const [kanbansResult, tasksResult] = await Promise.all([
      supabase.from("Kanban").select("*").eq("site_id", siteId),
      supabase
        .from("Task")
        .select("*")
        .eq("site_id", siteId)
        .eq("archived", false),
    ]);

    if (kanbansResult.error) {
      log.error("Error fetching kanbans:", kanbansResult.error);
      throw kanbansResult.error;
    }
    if (tasksResult.error) {
      log.error("Error fetching tasks:", tasksResult.error);
      throw tasksResult.error;
    }

    const kanbans = kanbansResult.data || [];
    const tasks = tasksResult.data || [];

    // If no tasks, return early
    if (tasks.length === 0) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      });
    }

    // Get IDs for filtering
    const kanbanIds = kanbans.map((k) => k.id);
    const taskIds = tasks.map((task) => task.id);

    // PHASE 2: Parallel fetch of all related data with direct site filter
    const [
      columnsResult,
      clientsResult,
      sellProductsResult,
      filesResult,
      qualityControlResult,
      packingControlResult,
    ] = await Promise.all([
      // Columns filtered by kanban IDs
      kanbanIds.length > 0
        ? supabase
          .from("KanbanColumn")
          .select("*")
          .in("kanbanId", kanbanIds)
        : Promise.resolve({ data: [], error: null }),

      // Clients and SellProducts with direct site filter
      supabase.from("Client").select("*").eq("site_id", siteId),
      supabase.from("SellProduct").select("*").eq("site_id", siteId),

      // Files, QC, Packing filtered by task IDs
      taskIds.length > 0
        ? supabase.from("File").select("*").in("taskId", taskIds)
        : Promise.resolve({ data: [], error: null }),
      taskIds.length > 0
        ? supabase
          .from("QualityControl")
          .select("*")
          .in("taskId", taskIds)
        : Promise.resolve({ data: [], error: null }),
      taskIds.length > 0
        ? supabase
          .from("PackingControl")
          .select("*")
          .in("taskId", taskIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Handle errors from parallel queries
    const errors = [
      columnsResult.error &&
      { name: "columns", error: columnsResult.error },
      clientsResult.error &&
      { name: "clients", error: clientsResult.error },
      sellProductsResult.error &&
      { name: "sellProducts", error: sellProductsResult.error },
      filesResult.error && { name: "files", error: filesResult.error },
      qualityControlResult.error &&
      { name: "qualityControl", error: qualityControlResult.error },
      packingControlResult.error &&
      { name: "packingControl", error: packingControlResult.error },
    ].filter(Boolean);

    if (errors.length > 0) {
      errors.forEach((e) => log.error(`Error fetching ${e!.name}:`, e!.error));
      throw new Error(
        `Failed to fetch related data: ${
          errors.map((e) => e!.name).join(", ")
        }`,
      );
    }

    const columns = columnsResult.data || [];
    const clients = clientsResult.data || [];
    const sellProducts = sellProductsResult.data || [];
    const files = filesResult.data || [];
    const qualityControl = qualityControlResult.data || [];
    const packingControl = packingControlResult.data || [];

    // Create lookup maps for O(1) access instead of O(n) find operations
    const columnMap = new Map(columns.map((c) => [c.id, c]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const kanbanMap = new Map(kanbans.map((k) => [k.id, k]));
    const sellProductMap = new Map(sellProducts.map((p) => [p.id, p]));

    // Group files, QC, and packing by taskId for efficient lookup
    const filesByTaskId = new Map<number, typeof files>();
    files.forEach((f) => {
      const existing = filesByTaskId.get(f.taskId) || [];
      existing.push(f);
      filesByTaskId.set(f.taskId, existing);
    });

    const qcByTaskId = new Map<number, typeof qualityControl>();
    qualityControl.forEach((qc) => {
      const existing = qcByTaskId.get(qc.taskId) || [];
      existing.push(qc);
      qcByTaskId.set(qc.taskId, existing);
    });

    const packingByTaskId = new Map<number, typeof packingControl>();
    packingControl.forEach((pc) => {
      const existing = packingByTaskId.get(pc.taskId) || [];
      existing.push(pc);
      packingByTaskId.set(pc.taskId, existing);
    });

    // Build the response with relationships using O(1) lookups
    const tasksWithRelations = tasks.map((task) => ({
      ...task,
      column: columnMap.get(task.kanbanColumnId),
      client: clientMap.get(task.clientId),
      kanban: kanbanMap.get(task.kanbanId),
      files: filesByTaskId.get(task.id) || [],
      sellProduct: sellProductMap.get(task.sellProductId),
      QualityControl: qcByTaskId.get(task.id) || [],
      PackingControl: packingByTaskId.get(task.id) || [],
    }));

    return NextResponse.json(tasksWithRelations, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    log.error("Error in /api/kanban/tasks:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
