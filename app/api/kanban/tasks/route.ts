import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        archived: false,
      },
      include: {
        column: true,
        client: true,
        kanban: true,
        files: true,
        sellProduct: true,
        QualityControl: { include: { items: true } },
        PackingControl: { include: { items: true } },
      },
    });

    return NextResponse.json(tasks, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
