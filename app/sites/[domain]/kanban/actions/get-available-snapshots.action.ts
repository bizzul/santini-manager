"use server";
import { createClient } from "@/utils/supabase/server";

export async function getAvailableSnapshots() {
  try {
    const supabase = await createClient();

    // First, get all task history entries ordered by creation time
    const { data: taskHistories, error } = await supabase
      .from("task_history")
      .select("createdAt")
      .order("createdAt", { ascending: false })
      .limit(1000); // Limit to avoid performance issues

    if (error) {
      console.error("Error fetching task histories:", error);
      throw new Error("Failed to fetch task histories");
    }

    if (!taskHistories || taskHistories.length === 0) {
      return [];
    }

    // Group by minute and count tasks
    const groupedByMinute = new Map<
      string,
      { timestamp: Date; count: number }
    >();

    taskHistories.forEach((history) => {
      const createdAt = new Date(history.createdAt);
      // Truncate to minute
      const minuteKey = new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate(),
        createdAt.getHours(),
        createdAt.getMinutes(),
      ).toISOString();

      if (groupedByMinute.has(minuteKey)) {
        groupedByMinute.get(minuteKey)!.count++;
      } else {
        groupedByMinute.set(minuteKey, {
          timestamp: new Date(minuteKey),
          count: 1,
        });
      }
    });

    // Convert to array and sort by timestamp descending
    const snapshots = Array.from(groupedByMinute.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50) // Limit to 50 most recent
      .map((snapshot) => ({
        timestamp: snapshot.timestamp,
        taskCount: snapshot.count,
      }));

    return snapshots;
  } catch (error) {
    console.error("Error in getAvailableSnapshots:", error);
    throw new Error("Failed to get available snapshots");
  }
}
