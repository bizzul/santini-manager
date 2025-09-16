import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: filteredKanban } = await params;
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

    // First get the kanban (filter by site_id if available)
    let kanbanQuery = supabase
      .from("Kanban")
      .select("*")
      .eq("identifier", filteredKanban);

    if (siteId) {
      kanbanQuery = kanbanQuery.eq("site_id", siteId);
    }

    const { data: kanban, error: kanbanError } = await kanbanQuery.single();

    if (kanbanError) {
      console.error("Error fetching kanban:", kanbanError);
      return NextResponse.json({ error: "Kanban not found" }, { status: 404 });
    }

    // Then get the columns for this kanban
    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("*")
      .eq("kanbanId", kanban.id)
      .order("position", { ascending: true });

    if (columnsError) {
      console.error("Error fetching columns:", columnsError);
      return NextResponse.json({ error: "Failed to fetch columns" }, {
        status: 500,
      });
    }

    // Return kanban with columns
    return NextResponse.json({
      ...kanban,
      columns: columns || [],
    });
  } catch (error) {
    console.error("Error in kanban API:", error);
    return NextResponse.json({ error: "Internal server error" }, {
      status: 500,
    });
  }
}
