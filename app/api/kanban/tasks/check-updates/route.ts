import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const ifModifiedSince = request.headers.get("If-Modified-Since");

    // Get the latest modification time from tasks and actions
    const [latestTaskResult, latestActionResult] = await Promise.all([
      supabase
        .from("Task")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1),
      supabase
        .from("Action")
        .select("createdAt")
        .order("createdAt", { ascending: false })
        .limit(1),
    ]);

    if (latestTaskResult.error) throw latestTaskResult.error;
    if (latestActionResult.error) throw latestActionResult.error;

    const latestTask = latestTaskResult.data?.[0];
    const latestAction = latestActionResult.data?.[0];

    // Get the most recent timestamp between tasks and actions
    const taskTimestamp = latestTask?.updated_at;
    const actionTimestamp = latestAction?.createdAt;

    // Ensure we always have a valid Date object
    let lastModified: Date;
    if (taskTimestamp && actionTimestamp) {
      const taskDate = new Date(taskTimestamp);
      const actionDate = new Date(actionTimestamp);
      lastModified = new Date(
        Math.max(taskDate.getTime(), actionDate.getTime()),
      );
    } else if (taskTimestamp) {
      lastModified = new Date(taskTimestamp);
    } else if (actionTimestamp) {
      lastModified = new Date(actionTimestamp);
    } else {
      lastModified = new Date(); // Fallback to current time
    }

    const lastModifiedString = lastModified.toUTCString();

    // If the client's timestamp is newer or equal to our last modified time, return 304
    if (ifModifiedSince && new Date(ifModifiedSince) >= lastModified) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "Last-Modified": lastModifiedString,
        },
      });
    }

    // Return the last modified time
    return NextResponse.json(
      { hasUpdates: true },
      {
        headers: {
          "Last-Modified": lastModifiedString,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Error checking for updates:", error);
    return NextResponse.json(
      { error: "Failed to check for updates" },
      { status: 500 },
    );
  }
}
