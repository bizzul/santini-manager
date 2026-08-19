import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import { createServiceClient } from "@/utils/supabase/server";
import { buildDocumentFilename } from "@/lib/document-filename";
import { getDocumentTypeLabel } from "@/lib/documenti/document-types";
import { getPdfLogoBuffer } from "@/lib/pdf-report-branding";
import { buildProjectSummaryPdf } from "@/lib/project-summary-pdf";

export const dynamic = "force-dynamic";

function clientDisplayName(client: {
  businessName?: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
} | null): string {
  if (!client) return "Cliente";
  return (
    client.businessName?.trim() ||
    `${client.individualLastName ?? ""} ${client.individualFirstName ?? ""}`.trim() ||
    "Cliente"
  );
}

export async function POST(req: NextRequest) {
  const userContext = await getUserContext();
  if (!userContext?.userId) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const siteContext = await getSiteContext(req);
  if (!hasSiteId(siteContext)) {
    return NextResponse.json(
      { error: "Contesto sito non disponibile" },
      { status: 400 },
    );
  }

  const payload = await req.json().catch(() => null);
  const taskId = Number(payload?.taskId);
  if (!Number.isFinite(taskId) || taskId <= 0) {
    return NextResponse.json({ error: "taskId obbligatorio" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: task, error: taskError } = await supabase
    .from("Task")
    .select(
      `
      id,
      unique_code,
      name,
      title,
      sellPrice,
      created_at,
      deliveryDate,
      archived,
      other,
      client:Client!clientId(
        businessName,
        individualFirstName,
        individualLastName
      ),
      column:KanbanColumn!kanbanColumnId(title),
      sellProduct:SellProduct!sellProductId(
        category:sellproduct_categories(name)
      )
    `,
    )
    .eq("id", taskId)
    .eq("site_id", siteContext.siteId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json(
      { error: "Errore nel recupero del progetto", details: taskError.message },
      { status: 500 },
    );
  }

  if (!task) {
    return NextResponse.json({ error: "Progetto non trovato" }, { status: 404 });
  }

  const { data: documentiRows } = await supabase
    .from("documenti")
    .select("tipo_documento, created_at")
    .eq("site_id", siteContext.siteId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  const client = Array.isArray(task.client) ? task.client[0] : task.client;
  const column = Array.isArray(task.column) ? task.column[0] : task.column;
  const sellProduct = Array.isArray(task.sellProduct)
    ? task.sellProduct[0]
    : task.sellProduct;
  const category = Array.isArray(sellProduct?.category)
    ? sellProduct?.category[0]
    : sellProduct?.category;

  const uniqueCode = task.unique_code || `P${task.id}`;
  const projectName = task.name || task.title || uniqueCode;
  const clientName = clientDisplayName(client);
  const statusLabel = task.archived
    ? `${column?.title || "Archiviato"} (archiviato)`
    : column?.title || "-";

  let siteName = siteContext.siteData?.name || "FDM";
  let siteLogo = siteContext.siteData?.logo ?? null;
  if (!siteContext.siteData) {
    const { data: siteRow } = await supabase
      .from("sites")
      .select("name, logo")
      .eq("id", siteContext.siteId)
      .maybeSingle();
    siteName = siteRow?.name || siteName;
    siteLogo = siteRow?.logo ?? siteLogo;
  }

  const logoBuffer = await getPdfLogoBuffer(siteLogo);

  const pdfBytes = await buildProjectSummaryPdf({
    siteName,
    uniqueCode,
    projectName,
    clientName,
    categoryName: category?.name || "Senza categoria",
    statusLabel,
    createdAt: task.created_at,
    deliveryDate: task.deliveryDate,
    sellPrice: task.sellPrice == null ? null : Number(task.sellPrice),
    documents: (documentiRows ?? []).map((row) => ({
      tipo: getDocumentTypeLabel(row.tipo_documento),
      date: row.created_at,
    })),
    comments: task.other,
    logoBytes: logoBuffer ? Uint8Array.from(logoBuffer) : null,
  });

  const filename = buildDocumentFilename({
    projectNumber: uniqueCode,
    documentType: "RiepilogoProgetto",
    clientName,
    generatedAt: new Date(),
    extension: "pdf",
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
