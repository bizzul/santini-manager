import { NextRequest, NextResponse } from "next/server";
import { duplicateKanbanCategory } from "@/app/sites/[domain]/kanban/actions/duplicate-kanban-category.action";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoryId, domain } = body;

    if (!categoryId || !domain) {
      return NextResponse.json(
        { error: "Category ID and domain are required" },
        { status: 400 },
      );
    }

    const result = await duplicateKanbanCategory(Number(categoryId), domain);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error duplicating kanban category:", error);
    return NextResponse.json(
      { error: "Failed to duplicate kanban category" },
      { status: 500 },
    );
  }
}
