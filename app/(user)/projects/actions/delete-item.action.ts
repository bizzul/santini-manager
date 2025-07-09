"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../../prisma-global";

export const removeItem = async (id: number) => {
  try {
    // Delete TaskHistory records first
    const taskHistory = await prisma.taskHistory.findMany({
      where: {
        taskId: id,
      },
    });
    if (taskHistory.length > 0) {
      await prisma.taskHistory.deleteMany({
        where: {
          taskId: id,
        },
      });
    }

    const qc = await prisma.qualityControl.findMany({
      where: {
        taskId: id,
      },
    });
    if (qc.length > 0) {
      await prisma.qualityControl.deleteMany({
        where: {
          taskId: id,
        },
      });
    }

    const boxing = await prisma.packingControl.findMany({
      where: {
        taskId: id,
      },
    });
    if (boxing.length > 0) {
      await prisma.packingControl.deleteMany({
        where: {
          taskId: id,
        },
      });
    }
    await prisma.task.delete({
      where: { id: id },
    });
    return revalidatePath("/projects");
  } catch (e) {
    return { message: `Failed to delete item: ${e}` };
  }
};
