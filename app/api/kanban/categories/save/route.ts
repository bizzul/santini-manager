import { NextRequest, NextResponse } from "next/server";
import { saveKanbanCategory } from "@/app/sites/[domain]/kanban/actions/save-kanban-category.action";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, domain } = body;

    if (!category || !domain) {
      return NextResponse.json(
        { error: "Category and domain are required" },
        { status: 400 },
      );
    }

    const result = await saveKanbanCategory(category, domain);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error saving kanban category:", error);
    return NextResponse.json(
      { error: "Failed to save kanban category" },
      { status: 500 },
    );
  }
}
