import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma-global";

export async function GET() {
  try {
    // Get all kanbans with their columns
    const kanbans = await prisma.kanban.findMany({
      include: {
        columns: {
          orderBy: {
            position: "asc",
          },
        },
        Task: {
          select: {
            id: true,
            unique_code: true,
            title: true,
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });

    // Get database connection info
    const dbInfo = {
      kanbanCount: kanbans.length,
      totalColumns: kanbans.reduce(
        (acc, kanban) => acc + kanban.columns.length,
        0
      ),
      totalTasks: kanbans.reduce((acc, kanban) => acc + kanban.Task.length, 0),
      kanbans: kanbans.map((kanban) => ({
        id: kanban.id,
        title: kanban.title,
        identifier: kanban.identifier,
        color: kanban.color,
        columnCount: kanban.columns.length,
        taskCount: kanban.Task.length,
        columns: kanban.columns.map((col) => ({
          id: col.id,
          title: col.title,
          identifier: col.identifier,
          position: col.position,
        })),
      })),
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: dbInfo,
    });
  } catch (error) {
    console.error("Error in debug kanbans API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch debug data",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
