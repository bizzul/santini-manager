import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const log = logger.scope("KanbanTasks");
const TIMETRACKING_SELECT_WITH_USER =
  "task_id, user_id, employee_id, use_cnc, end_time, totalTime, hours, minutes";
const TIMETRACKING_SELECT_NO_USER =
  "task_id, employee_id, use_cnc, end_time, totalTime, hours, minutes";

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

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(req);
    const { searchParams } = new URL(req.url);
    const requestedKanbanId = Number.parseInt(
      searchParams.get("kanbanId") || "",
      10
    );
    const hasKanbanFilter = Number.isFinite(requestedKanbanId);

    // In multi-tenant, siteId is required
    if (!siteId) {
      log.warn("KanbanTasks API called without siteId");
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 },
      );
    }

    log.debug("Fetching kanban tasks", {
      siteId,
      kanbanId: hasKanbanFilter ? requestedKanbanId : null,
    });

    // PHASE 1: Parallel fetch of kanbans and tasks with direct site filter
    const kanbanQuery = supabase.from("Kanban").select("*").eq("site_id", siteId);
    const taskQuery = supabase
      .from("Task")
      .select("*")
      .eq("site_id", siteId)
      .eq("archived", false);

    const [kanbansResult, tasksResult] = await Promise.all([
      hasKanbanFilter ? kanbanQuery.eq("id", requestedKanbanId) : kanbanQuery,
      hasKanbanFilter ? taskQuery.eq("kanbanId", requestedKanbanId) : taskQuery,
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
    const clientIds = Array.from(
      new Set(tasks.map((task) => task.clientId).filter(Boolean))
    );
    const sellProductIds = Array.from(
      new Set(tasks.map((task) => task.sellProductId).filter(Boolean))
    );

    // PHASE 2: Parallel fetch of all related data with direct site filter
    const timetrackingPromise =
      taskIds.length > 0
        ? (async () => {
          let result = await supabase
            .from("Timetracking")
            .select(TIMETRACKING_SELECT_WITH_USER)
            .in("task_id", taskIds)
            .eq("site_id", siteId);

          if (result.error && shouldRetryTimetrackingWithoutUserId(result.error)) {
            log.warn(
              "Timetracking.user_id not available, retrying query without user_id"
            );
            result = await supabase
              .from("Timetracking")
              .select(TIMETRACKING_SELECT_NO_USER)
              .in("task_id", taskIds)
              .eq("site_id", siteId) as typeof result;
          }

          return result;
        })()
        : Promise.resolve({ data: [], error: null });

    const [
      columnsResult,
      clientsResult,
      sellProductsResult,
      filesResult,
      qualityControlResult,
      packingControlResult,
      taskSuppliersResult,
      timetrackingResult,
    ] = await Promise.all([
      // Columns filtered by kanban IDs
      hasKanbanFilter
        ? supabase
          .from("KanbanColumn")
          .select("*")
          .eq("kanbanId", requestedKanbanId)
        : kanbanIds.length > 0
        ? supabase
          .from("KanbanColumn")
          .select("*")
          .in("kanbanId", kanbanIds)
        : Promise.resolve({ data: [], error: null }),

      // Clients and SellProducts fetched only for the current tasks when possible
      clientIds.length > 0
        ? supabase.from("Client").select("*").in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),
      sellProductIds.length > 0
        ? supabase
          .from("SellProduct")
          .select("*, category:sellproduct_categories(id, name, color)")
          .in("id", sellProductIds)
        : Promise.resolve({ data: [], error: null }),

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
      taskIds.length > 0
        ? supabase
          .from("TaskSupplier")
          .select("*, supplier:Supplier(*)")
          .in("taskId", taskIds)
        : Promise.resolve({ data: [], error: null }),
      timetrackingPromise,
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
      taskSuppliersResult.error &&
      { name: "taskSuppliers", error: taskSuppliersResult.error },
      timetrackingResult.error &&
      { name: "timetracking", error: timetrackingResult.error },
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
    const taskSuppliers = taskSuppliersResult.data || [];
    const timetracking = timetrackingResult.data || [];

    const trackedUserIds = Array.from(
      new Set(
        timetracking
          .map((entry) => entry.user_id || entry.employee_id)
          .filter(Boolean)
          .map((value) => String(value))
      )
    );

    const userProfilesResult =
      trackedUserIds.length > 0
        ? await supabase
          .from("User")
          .select("id, given_name, family_name, initials, picture, email")
          .in("id", trackedUserIds)
        : { data: [], error: null };

    if (userProfilesResult.error) {
      log.error("Error fetching user profiles:", userProfilesResult.error);
      throw new Error("Failed to fetch related data: userProfiles");
    }

    const userProfiles = userProfilesResult.data || [];

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

    const suppliersByTaskId = new Map<number, typeof taskSuppliers>();
    const activeSuppliersCountByTaskId = new Map<number, number>();
    taskSuppliers.forEach((item) => {
      const existing = suppliersByTaskId.get(item.taskId) || [];
      existing.push(item);
      suppliersByTaskId.set(item.taskId, existing);

      const isActive =
        !item.deliveryDate || item.deliveryDate.slice(0, 10) >= todayIso;
      if (isActive) {
        activeSuppliersCountByTaskId.set(
          item.taskId,
          (activeSuppliersCountByTaskId.get(item.taskId) || 0) + 1
        );
      }
    });

    const activeEntriesByTaskId = new Map<number, typeof timetracking>();
    const activeMachinesCountByTaskId = new Map<number, number>();
    const activeCollaboratorsByTaskId = new Map<number, Set<string>>();
    timetracking.forEach((entry) => {
      if (entry.end_time) return;
      const existing = activeEntriesByTaskId.get(entry.task_id) || [];
      existing.push(entry);
      activeEntriesByTaskId.set(entry.task_id, existing);

      if (entry.use_cnc === true) {
        activeMachinesCountByTaskId.set(
          entry.task_id,
          (activeMachinesCountByTaskId.get(entry.task_id) || 0) + 1
        );
      }

      const collaboratorId = String(entry.user_id || entry.employee_id || "");
      if (collaboratorId) {
        const collaborators = activeCollaboratorsByTaskId.get(entry.task_id) || new Set<string>();
        collaborators.add(collaboratorId);
        activeCollaboratorsByTaskId.set(entry.task_id, collaborators);
      }
    });

    const timetrackingByTaskId = new Map<number, typeof timetracking>();
    timetracking.forEach((entry) => {
      const existing = timetrackingByTaskId.get(entry.task_id) || [];
      existing.push(entry);
      timetrackingByTaskId.set(entry.task_id, existing);
    });

    const userProfileMap = new Map(userProfiles.map((user) => [user.id, user]));

    const todayIso = new Date().toISOString().slice(0, 10);

    // Build the response with relationships using O(1) lookups
    const tasksWithRelations = tasks.map((task) => {
      const allTaskEntries = timetrackingByTaskId.get(task.id) || [];
      const collaboratorTotalsMap = new Map<
        string,
        {
          id: string;
          name: string;
          initials: string;
          picture: string | null;
          hours: number;
          entries: number;
        }
      >();

      allTaskEntries.forEach((entry) => {
        const collaboratorIdRaw = entry.user_id || entry.employee_id;
        if (!collaboratorIdRaw) return;

        const collaboratorId = String(collaboratorIdRaw);
        const profile = userProfileMap.get(collaboratorId);
        const fullName = `${profile?.family_name || ""} ${profile?.given_name || ""}`
          .trim()
          .replace(/\s+/g, " ");
        const name = fullName || profile?.email || "Collaboratore";

        const existing = collaboratorTotalsMap.get(collaboratorId) || {
          id: collaboratorId,
          name,
          initials: profile?.initials || deriveInitials(name),
          picture: profile?.picture || null,
          hours: 0,
          entries: 0,
        };

        existing.hours += resolveEntryHours(entry);
        existing.entries += 1;
        collaboratorTotalsMap.set(collaboratorId, existing);
      });

      const collaboratorTimeSummaries = Array.from(collaboratorTotalsMap.values())
        .map((summary) => ({
          ...summary,
          hours: Math.round((summary.hours + Number.EPSILON) * 100) / 100,
        }))
        .sort((a, b) => b.hours - a.hours);

      return {
        ...task,
        column: columnMap.get(task.kanbanColumnId),
        client: clientMap.get(task.clientId),
        kanban: kanbanMap.get(task.kanbanId),
        files: filesByTaskId.get(task.id) || [],
        taskSuppliers: suppliersByTaskId.get(task.id) || [],
        sellProduct: sellProductMap.get(task.sellProductId),
        QualityControl: qcByTaskId.get(task.id) || [],
        PackingControl: packingByTaskId.get(task.id) || [],
        activeSuppliersCount: activeSuppliersCountByTaskId.get(task.id) || 0,
        activeMachinesCount: activeMachinesCountByTaskId.get(task.id) || 0,
        activeCollaborators: Array.from(activeCollaboratorsByTaskId.get(task.id) || new Set<string>())
          .map((userId) => {
            const profile = userProfileMap.get(userId);
            if (!profile) return null;
            const fullName = `${profile.family_name || ""} ${profile.given_name || ""}`
              .trim()
              .replace(/\s+/g, " ");
            const resolvedName = fullName || profile.email || "Collaboratore";
            return {
              id: profile.id,
              fullName: resolvedName,
              initials: profile.initials || deriveInitials(resolvedName),
              picture: profile.picture || null,
              email: profile.email || "",
            };
          })
          .filter(Boolean),
        collaboratorTimeSummaries,
      };
    });

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
