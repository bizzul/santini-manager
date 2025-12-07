import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { getSiteData } from "../../../../lib/fetchers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
        console.error("Error fetching site data:", error);
      }
    }

    // STEP 1: Get kanbans filtered by site_id FIRST (needed to filter columns)
    let kanbansQuery = supabase.from("Kanban").select("*");
    if (siteId) {
      kanbansQuery = kanbansQuery.eq("site_id", siteId);
    }
    const { data: kanbans, error: kanbansError } = await kanbansQuery;

    if (kanbansError) {
      console.error("Error fetching kanbans:", kanbansError);
      throw kanbansError;
    }

    // Get kanban IDs for filtering columns
    const kanbanIds = kanbans?.map((k) => k.id) || [];

    // STEP 2: Get columns only for kanbans of this site (OPTIMIZED)
    let columnsQuery = supabase.from("KanbanColumn").select("*");
    if (kanbanIds.length > 0) {
      columnsQuery = columnsQuery.in("kanbanId", kanbanIds);
    }
    const { data: columns, error: columnsError } = await columnsQuery;

    if (columnsError) {
      console.error("Error fetching columns:", columnsError);
      throw columnsError;
    }

    // STEP 3: Get all non-archived tasks (filter by site_id if available)
    let tasksQuery = supabase
      .from("Task")
      .select("*")
      .eq("archived", false);

    if (siteId) {
      tasksQuery = tasksQuery.eq("site_id", siteId);
    }

    const { data: tasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    // Get related data for all tasks
    const taskIds = tasks.map((task) => task.id);

    // STEP 4: Get clients filtered by site_id (OPTIMIZED)
    let clientsQuery = supabase.from("Client").select("*");
    if (siteId) {
      clientsQuery = clientsQuery.eq("site_id", siteId);
    }
    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      throw clientsError;
    }

    // STEP 5: Get sellProducts filtered by site_id (OPTIMIZED)
    let sellProductsQuery = supabase.from("SellProduct").select("*");
    if (siteId) {
      sellProductsQuery = sellProductsQuery.eq("site_id", siteId);
    }
    const { data: sellProducts, error: sellProductsError } = await sellProductsQuery;

    if (sellProductsError) {
      console.error("Error fetching sellProducts:", sellProductsError);
      throw sellProductsError;
    }

    // STEP 6: Get files only for tasks of this site (OPTIMIZED)
    let filesQuery = supabase.from("File").select("*");
    if (taskIds.length > 0) {
      filesQuery = filesQuery.in("taskId", taskIds);
    }
    const { data: files, error: filesError } = await filesQuery;

    if (filesError) {
      console.error("Error fetching files:", filesError);
      throw filesError;
    }

    // STEP 7: Get qualityControl only for tasks of this site (OPTIMIZED)
    let qcQuery = supabase.from("QualityControl").select("*");
    if (taskIds.length > 0) {
      qcQuery = qcQuery.in("taskId", taskIds);
    }
    const { data: qualityControl, error: qcError } = await qcQuery;

    if (qcError) {
      console.error("Error fetching qualityControl:", qcError);
      throw qcError;
    }

    // STEP 8: Get packingControl only for tasks of this site (OPTIMIZED)
    let pcQuery = supabase.from("PackingControl").select("*");
    if (taskIds.length > 0) {
      pcQuery = pcQuery.in("taskId", taskIds);
    }
    const { data: packingControl, error: pcError } = await pcQuery;

    if (pcError) {
      console.error("Error fetching packingControl:", pcError);
      throw pcError;
    }

    // Build the response with relationships
    const tasksWithRelations = tasks.map((task) => ({
      ...task,
      column: columns.find((col) => col.id === task.kanbanColumnId),
      client: clients.find((client) => client.id === task.clientId),
      kanban: kanbans.find((kanban) => kanban.id === task.kanbanId),
      files: files.filter((file) => file.taskId === task.id),
      sellProduct: sellProducts.find((product) =>
        product.id === task.sellProductId
      ),
      QualityControl: qualityControl.filter((qc) => qc.taskId === task.id),
      PackingControl: packingControl.filter((pc) => pc.taskId === task.id),
    }));

    return NextResponse.json(tasksWithRelations, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    console.error("Error in /api/kanban/tasks:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
