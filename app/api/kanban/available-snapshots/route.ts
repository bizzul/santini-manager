import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSiteContext } from "@/lib/site-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { siteId } = await getSiteContext(request);

    if (!siteId) {
      return NextResponse.json(
        { error: "Site ID required" },
        { status: 400 }
      );
    }

    const { data: taskHistories, error } = await supabase
      .from("TaskHistory")
      .select(`
        createdAt,
        task:taskId(site_id)
      `)
      .eq("task.site_id", siteId)
      .order("createdAt", { ascending: false })
      .limit(1000);

    if (error) {
      throw error;
    }

    if (!taskHistories || taskHistories.length === 0) {
      return NextResponse.json([]);
    }

    const groupedByMinute = new Map<
      string,
      { timestamp: Date; count: number }
    >();

    taskHistories.forEach((history) => {
      const createdAt = new Date(history.createdAt);
      const minuteKey = new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate(),
        createdAt.getHours(),
        createdAt.getMinutes()
      ).toISOString();

      if (groupedByMinute.has(minuteKey)) {
        groupedByMinute.get(minuteKey)!.count += 1;
      } else {
        groupedByMinute.set(minuteKey, {
          timestamp: new Date(minuteKey),
          count: 1,
        });
      }
    });

    const snapshots = Array.from(groupedByMinute.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50)
      .map((snapshot) => ({
        timestamp: snapshot.timestamp,
        taskCount: snapshot.count,
      }));

    return NextResponse.json(snapshots);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
