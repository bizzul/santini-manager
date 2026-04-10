import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { buildCollaboratorTimeSummaries, roundCurrency } from "@/lib/project-consuntivo";

function buildInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "CL";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const { taskId: taskIdParam } = await params;
  const taskId = Number(taskIdParam);
  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "Task non valido" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: timeEntries, error } = await supabase
    .from("Timetracking")
    .select(
      `
      id,
      employee_id,
      hours,
      minutes,
      totalTime,
      user:employee_id(
        id,
        given_name,
        family_name,
        color
      )
    `,
    )
    .eq("site_id", siteContext.siteId)
    .eq("task_id", taskId);

  if (error) {
    return NextResponse.json(
      { error: "Errore nel recupero ore", details: error.message },
      { status: 500 },
    );
  }

  const collaborators = buildCollaboratorTimeSummaries(timeEntries || []).map(
    (collaborator) => ({
      ...collaborator,
      initials: buildInitials(collaborator.name),
    }),
  );
  const totalHours = roundCurrency(
    collaborators.reduce((sum, collaborator) => sum + collaborator.hours, 0),
  );

  return NextResponse.json({
    taskId,
    totalHours,
    collaborators,
  });
}
