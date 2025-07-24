"use server";
import { prisma } from "../../../../prisma-global";

export async function getTaskHistory(taskId: number) {
  return await prisma.taskHistory.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
}
