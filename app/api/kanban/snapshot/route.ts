import { prisma } from "../../../../prisma-global";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timestamp = new Date(searchParams.get("timestamp") || "");

    // First get all tasks that existed at that time
    const taskHistories = await prisma.taskHistory.findMany({
      where: {
        createdAt: {
          lte: timestamp,
        },
        Task: {
          archived: false, // Only include histories for non-archived tasks
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      distinct: ["taskId"],
      include: {
        Task: {
          include: {
            column: true,
            kanban: true,
            client: true,
            suppliers: {
              include: {
                supplier: true,
              },
            },
            PackingControl: true,
            QualityControl: true,
            sellProduct: true,
          },
        },
      },
    });

    // Get all current active tasks
    const currentTasks = await prisma.task.findMany({
      where: {
        archived: false, // Only get non-archived tasks
      },
      include: {
        column: true,
        kanban: true,
        client: true,
        suppliers: {
          include: {
            supplier: true,
          },
        },
        PackingControl: true,
        QualityControl: true,
        sellProduct: true,
      },
    });

    // Create a map of tasks from history
    const historicalTasksMap = new Map(
      taskHistories.map((history) => [history.taskId, history.snapshot])
    );

    // Combine historical and current tasks
    const tasksAtTimestamp = currentTasks
      .map((task) => {
        const historicalVersion = historicalTasksMap.get(task.id);
        if (historicalVersion) {
          // Check if the historical version was archived
          if ((historicalVersion as any).archived) {
            return null; // Skip archived tasks
          }
          return {
            //@ts-ignore
            ...historicalVersion,
            //@ts-ignore
            kanbanColumnId: historicalVersion.kanbanColumnId,
            //@ts-ignore
            kanbanId: historicalVersion.kanbanId,
            //@ts-ignore
            column_position: historicalVersion.column_position,
            //@ts-ignore
            column: historicalVersion.column,
            //@ts-ignore
            kanban: historicalVersion.kanban,
            isPreview: true,
          };
        }
        // If no historical version exists, use current task
        return {
          ...task,
          isPreview: true,
        };
      })
      .filter(Boolean); // Remove null entries (archived tasks)

    return NextResponse.json(tasksAtTimestamp);
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshot" },
      { status: 500 }
    );
  }
}
