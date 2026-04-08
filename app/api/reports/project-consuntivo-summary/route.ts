import { NextRequest, NextResponse } from "next/server";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import {
  buildCollaboratorTimeSummaries,
  buildProjectCostSnapshot,
} from "@/lib/project-consuntivo";
import { createTabularReportResponse } from "@/lib/tabular-report-export";
import { createServiceClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type ConsuntivoRow = {
  Progetto: string;
  Cliente: string;
  Area: string;
  Ricavi: number;
  Costi: number;
  Margine: number;
  Ore: number;
};

function getClientName(task: any) {
  return (
    task.Client?.businessName ||
    `${task.Client?.individualLastName || ""} ${task.Client?.individualFirstName || ""}`.trim() ||
    "Cliente non associato"
  );
}

export async function POST(req: NextRequest) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const format = payload?.format === "pdf" ? "pdf" : "excel";
  const taskIds = Array.isArray(payload?.taskIds)
    ? payload.taskIds
        .map((taskId: unknown) => Number(taskId))
        .filter((taskId: number) => Number.isInteger(taskId))
    : [];

  if (taskIds.length === 0) {
    return NextResponse.json(
      { error: "Seleziona almeno un progetto" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const [{ data: tasks, error: tasksError }, { data: timeEntries, error: timeError }, { data: errorEntries, error: errorEntriesError }] =
    await Promise.all([
      supabase
        .from("Task")
        .select(`
          id,
          unique_code,
          name,
          title,
          sellPrice,
          consuntivo_material_cost,
          consuntivo_default_hourly_rate,
          consuntivo_collaborator_rates,
          Client:clientId(
            businessName,
            individualFirstName,
            individualLastName
          ),
          kanban:kanbanId(
            title,
            name
          )
        `)
        .eq("site_id", siteContext.siteId)
        .in("id", taskIds),
      supabase
        .from("Timetracking")
        .select(`
          task_id,
          employee_id,
          hours,
          minutes,
          totalTime,
          created_at,
          description,
          user:employee_id(
            id,
            given_name,
            family_name
          )
        `)
        .eq("site_id", siteContext.siteId)
        .in("task_id", taskIds),
      supabase
        .from("Errortracking")
        .select("task_id, material_cost")
        .in("task_id", taskIds),
    ]);

  if (tasksError || timeError || errorEntriesError) {
    return NextResponse.json(
      {
        error:
          tasksError?.message ||
          timeError?.message ||
          errorEntriesError?.message ||
          "Errore nel recupero dati consuntivo",
      },
      { status: 500 },
    );
  }

  const rows: ConsuntivoRow[] = (tasks || []).map((task: any) => {
    const projectTimeEntries = (timeEntries || []).filter(
      (entry: any) => Number(entry.task_id) === task.id,
    );
    const projectErrorEntries = (errorEntries || []).filter(
      (entry: any) => Number(entry.task_id) === task.id,
    );
    const collaborators = buildCollaboratorTimeSummaries(projectTimeEntries);
    const registeredMaterialCost = projectErrorEntries.reduce(
      (sum: number, entry: any) => sum + Number(entry.material_cost || 0),
      0,
    );
    const snapshot = buildProjectCostSnapshot({
      collaborators,
      projectValue: task.sellPrice,
      registeredMaterialCost,
      manualMaterialCost: task.consuntivo_material_cost,
      defaultHourlyRate: task.consuntivo_default_hourly_rate,
      collaboratorRates: task.consuntivo_collaborator_rates,
    });

    return {
      Progetto: task.unique_code || task.name || task.title || String(task.id),
      Cliente: getClientName(task),
      Area: task.kanban?.title || task.kanban?.name || "-",
      Ricavi: Number(snapshot.projectValue || 0),
      Costi: Number(snapshot.totalProjectCost || 0),
      Margine: Number(snapshot.margin || 0),
      Ore: Number(snapshot.totalTrackedHours || 0),
    };
  });

  const totals = rows.reduce(
    (accumulator, row) => ({
      Ricavi: accumulator.Ricavi + row.Ricavi,
      Costi: accumulator.Costi + row.Costi,
      Margine: accumulator.Margine + row.Margine,
      Ore: accumulator.Ore + row.Ore,
    }),
    { Ricavi: 0, Costi: 0, Margine: 0, Ore: 0 },
  );

  const rowsWithTotals: ConsuntivoRow[] = [
    ...rows,
    {
      Progetto: "Totale selezione",
      Cliente: "-",
      Area: "-",
      Ricavi: Number(totals.Ricavi.toFixed(2)),
      Costi: Number(totals.Costi.toFixed(2)),
      Margine: Number(totals.Margine.toFixed(2)),
      Ore: Number(totals.Ore.toFixed(2)),
    },
  ];

  return createTabularReportResponse({
    title: "Consuntivo progetti",
    subtitle: "Riepilogo costi, ricavi e margini dei progetti selezionati",
    sheetName: "Consuntivo",
    filenameBase: "report-consuntivo-progetti",
    format,
    rows: rowsWithTotals,
    columns: [
      { key: "Progetto", header: "Progetto", width: 20, pdfWidth: 96 },
      { key: "Cliente", header: "Cliente", width: 22, pdfWidth: 104 },
      { key: "Area", header: "Area", width: 18, pdfWidth: 72 },
      { key: "Ricavi", header: "Ricavi", width: 14, pdfWidth: 60, align: "right", numeric: true },
      { key: "Costi", header: "Costi", width: 14, pdfWidth: 60, align: "right", numeric: true },
      { key: "Margine", header: "Margine", width: 14, pdfWidth: 60, align: "right", numeric: true },
      { key: "Ore", header: "Ore", width: 12, pdfWidth: 48, align: "right", numeric: true },
    ],
    metaLines: [`Progetti selezionati: ${taskIds.length}`],
    siteName: siteContext.siteData?.name,
    logoUrl: siteContext.siteData?.logo,
    documentCode: "CONSUNTIVO",
  });
}
