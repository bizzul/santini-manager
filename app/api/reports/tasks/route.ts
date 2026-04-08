import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { calculateCurrentValue } from "../../../../package/utils/various/calculateCurrentValue";
import {
  addWorkbookReportHeader,
  setWorkbookDefaults,
  styleWorkbookTable,
} from "@/lib/workbook-report-branding";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type ProjectRow = {
  Numero: string;
  Cliente: string;
  Prodotto: string;
  Area: string;
  Fase: string;
  "Data Creazione": string;
  "Data consegna prevista": string;
  Percentuale: number;
  Ferramenta: string;
  Metalli: string;
  Altro: string;
  Posizioni: string;
  "Prezzo di vendita": number;
  Valore: number;
};

function filterOpenProjects(tasks: any[]) {
  return tasks.filter((task: any) => {
    const identifier = task.column?.identifier || task.kanban_columns?.identifier;
    return !task.archived && task.unique_code !== "9999" && identifier !== "SPEDITO";
  });
}

function sanitizeSheetName(value: string) {
  const sanitized = value.replace(/[\\/*?:[\]]/g, " ").trim();
  return sanitized.slice(0, 31) || "Area";
}

function getClientName(task: any) {
  const client = task.Client || task.clients;
  return (
    client?.businessName ||
    client?.business_name ||
    `${client?.individualLastName || ""} ${client?.individualFirstName || ""}`.trim() ||
    "Cliente non associato"
  );
}

function getAreaName(task: any) {
  return task.kanban?.title || task.kanban?.name || task.kanbans?.title || "Area non definita";
}

function toProjectRows(tasks: any[]): ProjectRow[] {
  return tasks.map((item: any) => {
    const created = item.created_at ? new Date(item.created_at) : null;
    const delivery = item.deliveryDate || item.delivery_date;
    const sellPrice = Number(item.sellPrice ?? item.sell_price ?? 0);

    return {
      Numero: item.unique_code || String(item.id),
      Cliente: getClientName(item),
      Prodotto: item.SellProduct?.name || item.sell_products?.name || "Nessun prodotto",
      Area: getAreaName(item),
      Fase: item.column?.title || item.kanban_columns?.title || "Nessuna fase",
      "Data Creazione": created ? created.toLocaleString("it-IT") : "-",
      "Data consegna prevista": delivery
        ? new Date(delivery).toLocaleString("it-IT")
        : "Non assegnata",
      Percentuale: Number(item.percent_status || item.percentStatus || 0),
      Ferramenta: item.ferramenta ? "Si" : "No",
      Metalli: item.metalli ? "Si" : "No",
      Altro: item.other || item.altro || "-",
      Posizioni: Array.isArray(item.positions) ? item.positions.join(", ") : "-",
      "Prezzo di vendita": sellPrice,
      Valore: sellPrice
        ? calculateCurrentValue(item, item.column?.position || item.kanban_columns?.position)
        : 0,
    };
  });
}

async function buildProjectsReport(
  req: NextRequest,
  productCategoryIds: number[],
  areaIds: number[],
) {
  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  let tasksQuery = supabase
    .from("Task")
    .select(`
      *,
      Client:clientId(*),
      SellProduct:sellProductId(id, name, type, category:category_id(id, name)),
      column:kanbanColumnId(*),
      kanban:kanbanId(*)
    `)
    .eq("site_id", siteContext.siteId);

  if (productCategoryIds.length > 0) {
    const { data: sellProducts, error: sellProductsError } = await supabase
      .from("SellProduct")
      .select("id")
      .eq("site_id", siteContext.siteId)
      .in("category_id", productCategoryIds);

    if (sellProductsError) {
      return NextResponse.json(
        { error: sellProductsError.message },
        { status: 500 },
      );
    }

    const productIds = (sellProducts || []).map((product) => product.id);
    tasksQuery = tasksQuery.in(
      "sellProductId",
      productIds.length > 0 ? productIds : [-1],
    );
  }

  if (areaIds.length > 0) {
    tasksQuery = tasksQuery.in("kanbanId", areaIds);
  }

  const { data: tasks, error } = await tasksQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filteredTasks = filterOpenProjects(tasks || []);
  const projectRows = toProjectRows(filteredTasks);
  const areaSummary = Array.from(
    projectRows.reduce((map, row) => {
      const current = map.get(row.Area) || {
        Area: row.Area,
        Progetti: 0,
        "Valore vendita": 0,
        "Valore corrente": 0,
      };
      current.Progetti += 1;
      current["Valore vendita"] += Number(row["Prezzo di vendita"] || 0);
      current["Valore corrente"] += Number(row.Valore || 0);
      map.set(row.Area, current);
      return map;
    }, new Map<string, any>()).values(),
  ).sort((left, right) => left.Area.localeCompare(right.Area));

  const date = new Date();
  const workbook = new ExcelJS.Workbook();
  setWorkbookDefaults(workbook, "Report progetti");

  const projectSheet = workbook.addWorksheet("Progetti completi");
  projectSheet.columns = [
    { header: "Numero", key: "Numero", width: 14 },
    { header: "Cliente", key: "Cliente", width: 24 },
    { header: "Prodotto", key: "Prodotto", width: 22 },
    { header: "Area", key: "Area", width: 20 },
    { header: "Fase", key: "Fase", width: 18 },
    { header: "Data Creazione", key: "Data Creazione", width: 18 },
    { header: "Data consegna prevista", key: "Data consegna prevista", width: 22 },
    { header: "Percentuale", key: "Percentuale", width: 12 },
    { header: "Ferramenta", key: "Ferramenta", width: 12 },
    { header: "Metalli", key: "Metalli", width: 10 },
    { header: "Altro", key: "Altro", width: 16 },
    { header: "Posizioni", key: "Posizioni", width: 22 },
    { header: "Prezzo di vendita", key: "Prezzo di vendita", width: 18 },
    { header: "Valore", key: "Valore", width: 14 },
  ];
  projectSheet.addRows(projectRows);
  addWorkbookReportHeader(projectSheet, {
    title: "Report progetti completo",
    subtitle: "Progetti del sito corrente filtrati per prodotto e area",
    metaLines: [
      `Categorie prodotto selezionate: ${
        productCategoryIds.length > 0 ? productCategoryIds.length : "tutte"
      }`,
      `Aree selezionate: ${areaIds.length > 0 ? areaIds.length : "tutte"}`,
      `Totale progetti: ${projectRows.length}`,
    ],
    generatedAt: date,
  });
  styleWorkbookTable(projectSheet, {
    headerRowNumber: 5,
    numericColumns: ["Percentuale", "Prezzo di vendita", "Valore"],
  });

  const summarySheet = workbook.addWorksheet("Riepilogo aree");
  summarySheet.columns = [
    { header: "Area", key: "Area", width: 24 },
    { header: "Progetti", key: "Progetti", width: 12 },
    { header: "Valore vendita", key: "Valore vendita", width: 18 },
    { header: "Valore corrente", key: "Valore corrente", width: 18 },
  ];
  summarySheet.addRows(areaSummary);
  addWorkbookReportHeader(summarySheet, {
    title: "Riepilogo progetti per area",
    subtitle: "Sintesi dei progetti aperti per area di lavoro",
    generatedAt: date,
  });
  styleWorkbookTable(summarySheet, {
    headerRowNumber: 5,
    numericColumns: ["Progetti", "Valore vendita", "Valore corrente"],
  });

  areaSummary.forEach((area) => {
    const areaRows = projectRows.filter((row) => row.Area === area.Area);
    const worksheet = workbook.addWorksheet(sanitizeSheetName(area.Area));
    worksheet.columns = projectSheet.columns;
    worksheet.addRows(areaRows);
    addWorkbookReportHeader(worksheet, {
      title: `Area - ${area.Area}`,
      subtitle: "Dettaglio progetti per area selezionata",
      metaLines: [`Progetti esportati: ${areaRows.length}`],
      generatedAt: date,
    });
    styleWorkbookTable(worksheet, {
      headerRowNumber: 5,
      numericColumns: ["Percentuale", "Prezzo di vendita", "Valore"],
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `report-progetti-${date.toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  return buildProjectsReport(req, [], []);
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const rawProductCategoryIds = Array.isArray(payload?.productCategoryIds)
    ? payload.productCategoryIds
    : Array.isArray(payload?.productIds)
      ? payload.productIds
      : [];
  const productCategoryIds = rawProductCategoryIds
    .map((productCategoryId: unknown) => Number(productCategoryId))
    .filter((productCategoryId: number) => Number.isInteger(productCategoryId));
  const areaIds = Array.isArray(payload?.areaIds)
    ? payload.areaIds
        .map((areaId: unknown) => Number(areaId))
        .filter((areaId: number) => Number.isInteger(areaId))
    : [];

  return buildProjectsReport(req, productCategoryIds, areaIds);
}
