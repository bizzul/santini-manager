"use server";
import { createClient } from "@/utils/supabase/server";
import { getSiteData } from "@/lib/fetchers";

export async function getAvailableSnapshots(domain?: string) {
  try {
    const supabase = await createClient();
    let siteId = null;

    // Get site information
    if (domain) {
      try {
        const siteResult = await getSiteData(domain);
        if (siteResult?.data) {
          siteId = siteResult.data.id;
        }
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    }

    // Get task history entries filtered by site_id if available
    let taskHistoryQuery = supabase
      .from("TaskHistory")
      .select("createdAt")
      .order("createdAt", { ascending: false })
      .limit(1000); // Limit to avoid performance issues

    if (siteId) {
      // Since TaskHistory doesn't have direct site_id, we need to join with Task
      taskHistoryQuery = supabase
        .from("TaskHistory")
        .select(`
          createdAt,
          task:taskId(site_id)
        `)
        .eq("task.site_id", siteId)
        .order("createdAt", { ascending: false })
        .limit(1000);
    }

    const { data: taskHistories, error } = await taskHistoryQuery;

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
