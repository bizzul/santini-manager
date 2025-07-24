"use server";
import { prisma } from "../../../../prisma-global";

export async function getAvailableSnapshots() {
  // Get distinct timestamps with at least one task history entry
  const snapshots = await prisma.$queryRaw`
    SELECT DISTINCT ON (DATE_TRUNC('minute', "createdAt")) 
    "createdAt" as timestamp,
    COUNT(*) OVER (PARTITION BY DATE_TRUNC('minute', "createdAt")) as task_count
    FROM "TaskHistory"
    ORDER BY DATE_TRUNC('minute', "createdAt") DESC, "createdAt" DESC
    LIMIT 50
  `;

  //@ts-ignore
  return snapshots.map((snapshot: any) => ({
    timestamp: snapshot.timestamp,
    taskCount: Number(snapshot.task_count),
  }));
}
