import { NextRequest, NextResponse } from "next/server";
import { getKanbanCategories } from "@/app/sites/[domain]/kanban/actions/get-kanban-categories.action";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const domain = searchParams.get("domain");
    const siteIdFromHeader = req.headers.get("x-site-id");

    if (!domain && !siteIdFromHeader) {
      return NextResponse.json(
        { error: "Domain or x-site-id is required" },
        { status: 400 }
      );
    }

    const categories = await getKanbanCategories({
      domain: domain || undefined,
      siteId: siteIdFromHeader || undefined,
    });

    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
      },
    });
  } catch (error) {
    console.error("Error fetching kanban categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch kanban categories" },
      { status: 500 }
    );
  }
}

