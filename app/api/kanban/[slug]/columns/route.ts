import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const kanbanId = slug;
    const supabase = await createClient();

    // Extract site_id from request headers or domain for filtering
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

    // First verify the kanban exists and belongs to the site
    let kanbanQuery = supabase
      .from("Kanban")
      .select("id, site_id")
      .eq("id", Number(kanbanId));

    if (siteId) {
      kanbanQuery = kanbanQuery.eq("site_id", siteId);
    }

    const { data: kanban, error: kanbanError } = await kanbanQuery.single();

    if (kanbanError || !kanban) {
      return NextResponse.json(
        { error: "Kanban not found" },
        { status: 404 }
      );
    }

    // Fetch all columns for this kanban, ordered by position
    const { data: columns, error: columnsError } = await supabase
      .from("KanbanColumn")
      .select("id, title, identifier, position, icon, column_type, is_creation_column")
      .eq("kanbanId", Number(kanbanId))
      .order("position", { ascending: true });

    if (columnsError) {
      console.error("Error fetching columns:", columnsError);
      return NextResponse.json(
        { error: "Failed to fetch columns" },
        { status: 500 }
      );
    }

    return NextResponse.json(columns || []);
  } catch (error) {
    console.error("Error in columns API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
