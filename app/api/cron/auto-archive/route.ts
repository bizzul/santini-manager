import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { logger } from "@/lib/logger";

/**
 * API Route per auto-archiviazione task
 *
 * Questa route viene chiamata periodicamente da un cron job (es: Vercel Cron)
 * per archiviare automaticamente i task con auto_archive_at scaduto.
 *
 * Configura in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-archive",
 *     "schedule": "0 2 * * *"  // Ogni giorno alle 2:00 AM
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // CRON_SECRET is REQUIRED. Missing env var or wrong header => 401.
    // In non-production environments, a missing secret only disables the cron
    // (returns 503) so local dev does not accidentally run archival logic.
    if (!cronSecret) {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "CRON_SECRET is not configured in production. Cron route is disabled.",
        );
      }
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 503 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Trova tutti i task con auto_archive_at scaduto e non ancora archiviati
    const { data: tasksToArchive, error: findError } = await supabase
      .from("Task")
      .select("id, unique_code, site_id")
      .eq("archived", false)
      .not("auto_archive_at", "is", null)
      .lt("auto_archive_at", now);

    if (findError) {
      logger.error("Error finding tasks to archive:", findError);
      return NextResponse.json(
        { error: "Failed to find tasks" },
        { status: 500 },
      );
    }

    if (!tasksToArchive || tasksToArchive.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tasks to archive",
        archived: 0,
      });
    }

    logger.info(`Found ${tasksToArchive.length} tasks to auto-archive`);

    // Archivia i task
    const taskIds = tasksToArchive.map((t) => t.id);
    const { error: updateError } = await supabase
      .from("Task")
      .update({
        archived: true,
        updated_at: now,
      })
      .in("id", taskIds);

    if (updateError) {
      logger.error("Error archiving tasks:", updateError);
      return NextResponse.json(
        { error: "Failed to archive tasks" },
        { status: 500 },
      );
    }

    // Log per ogni task archiviato
    const archivedCodes = tasksToArchive.map((t) => t.unique_code).join(", ");
    logger.info(`Auto-archived tasks: ${archivedCodes}`);

    return NextResponse.json({
      success: true,
      message: `Archived ${tasksToArchive.length} tasks`,
      archived: tasksToArchive.length,
      taskIds: taskIds,
    });
  } catch (error) {
    logger.error("Error in auto-archive cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST method per trigger manuale
export async function POST(request: NextRequest) {
  return GET(request);
}
