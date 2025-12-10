import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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
    // Verifica autorizzazione (opzionale, per sicurezza)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Se è configurato un secret, verificalo
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
      console.error("Error finding tasks to archive:", findError);
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

    console.log(`Found ${tasksToArchive.length} tasks to auto-archive`);

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
      console.error("Error archiving tasks:", updateError);
      return NextResponse.json(
        { error: "Failed to archive tasks" },
        { status: 500 },
      );
    }

    // Log per ogni task archiviato
    const archivedCodes = tasksToArchive.map((t) => t.unique_code).join(", ");
    console.log(`Auto-archived tasks: ${archivedCodes}`);

    return NextResponse.json({
      success: true,
      message: `Archived ${tasksToArchive.length} tasks`,
      archived: tasksToArchive.length,
      taskIds: taskIds,
    });
  } catch (error) {
    console.error("Error in auto-archive cron:", error);
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
