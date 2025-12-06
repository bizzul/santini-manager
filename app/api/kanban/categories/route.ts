import { NextRequest, NextResponse } from "next/server";
import { getKanbanCategories } from "@/app/sites/[domain]/kanban/actions/get-kanban-categories.action";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter is required" },
        { status: 400 }
      );
    }

    const categories = await getKanbanCategories(domain);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching kanban categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch kanban categories" },
      { status: 500 }
    );
  }
}

