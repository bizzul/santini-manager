"use server";
import { prisma } from "../../../../prisma-global";
import { revalidatePath } from "next/cache";

// Main function to save state and handle revalidation
export async function saveState() {
  try {
    const result = await saveKanbanState();
    if (result.success) {
      revalidatePath("/kanban");
      return { success: true };
    }
    return { success: false, error: result.reason };
  } catch (error) {
    console.error("Error saving state:", error);
    return { success: false, error: "Failed to save state" };
  }
}

// Internal function to handle the actual saving of state
async function saveKanbanState() {
  try {
    // Get all current tasks with their column and kanban information
    const currentTasks = await prisma.task.findMany({
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
      where: {
        archived: false,
      },
    });

    // Get the latest snapshot timestamp
    const latestSnapshot = await prisma.taskHistory.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Increase the cooldown to 5 minutes (300000 ms)
    if (
      !latestSnapshot ||
      Date.now() - latestSnapshot.createdAt.getTime() > 300000
    ) {
      // Create history entries for all tasks, including column and position data
      const historyPromises = currentTasks.map((task) => {
        const snapshotData = {
          ...task,
          kanbanColumnId: task.kanbanColumnId,
          kanbanId: task.kanbanId,
          column_position: task.column_position,
          column: {
            id: task.column?.id,
            title: task.column?.title,
            identifier: task.column?.identifier,
            position: task.column?.position,
          },
          kanban: {
            id: task.kanban?.id,
            title: task.kanban?.title,
            identifier: task.kanban?.identifier,
          },
        };

        return prisma.taskHistory.create({
          data: {
            taskId: task.id,
            snapshot: snapshotData,
          },
        });
      });

      await Promise.all(historyPromises);
      return { success: true };
    }
    return { success: false, reason: "Too soon since last snapshot" };
  } catch (error) {
    console.error("Error saving kanban state:", error);
    throw error;
  }
}
