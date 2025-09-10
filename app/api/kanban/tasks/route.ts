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

    // Get all non-archived tasks (filter by site_id if available)
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

    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("*");

    if (columnsError) {
      console.error("Error fetching columns:", columnsError);
      throw columnsError;
    }

    const { data: clients, error: clientsError } = await supabase
      .from("Client")
      .select("*");

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      throw clientsError;
    }

    // Get kanbans filtered by site_id if available
    let kanbansQuery = supabase
      .from("Kanban")
      .select("*");

    if (siteId) {
      kanbansQuery = kanbansQuery.eq("site_id", siteId);
    }

    const { data: kanbans, error: kanbansError } = await kanbansQuery;

    if (kanbansError) {
      console.error("Error fetching kanbans:", kanbansError);
      throw kanbansError;
    }

    const { data: files, error: filesError } = await supabase
      .from("File")
      .select("*");

    if (filesError) {
      console.error("Error fetching files:", filesError);
      throw filesError;
    }

    const { data: sellProducts, error: sellProductsError } = await supabase
      .from("SellProduct")
      .select("*");

    if (sellProductsError) {
      console.error("Error fetching sellProducts:", sellProductsError);
      throw sellProductsError;
    }

    const { data: qualityControl, error: qcError } = await supabase
      .from("QualityControl")
      .select("*");

    if (qcError) {
      console.error("Error fetching qualityControl:", qcError);
      throw qcError;
    }

    const { data: packingControl, error: pcError } = await supabase
      .from("PackingControl")
      .select("*");

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
