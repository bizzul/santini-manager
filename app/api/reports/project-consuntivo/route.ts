import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
} from "@pdfme/pdf-lib";
import { getUserContext } from "@/lib/auth-utils";
import { getSiteContext, hasSiteId } from "@/lib/site-context";
import {
  buildCollaboratorTimeSummaries,
  buildProjectCostSnapshot,
  formatHours,
  formatSwissCurrency,
  getEntryHours,
} from "@/lib/project-consuntivo";
import { createServiceClient } from "@/utils/supabase/server";
import { projectConsuntivoReportValidation } from "@/validation/task/consuntivo";
import {
  BOTTOM_MARGIN,
  BRAND,
  BRAND_MUTED,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  SOFT_BORDER,
  SOFT_FILL,
  TOP_HEADER_HEIGHT,
  drawPdfFooter,
  drawPdfReportHeader,
  formatReportDate,
  getPdfLogoBuffer,
  sanitizeReportFilename,
  wrapPdfText,
} from "@/lib/pdf-report-branding";

export const dynamic = "force-dynamic";

const SOFT_FILL_ALT = rgb(0.96, 0.97, 0.99);
const GREEN = rgb(0.04, 0.64, 0.42);
const RED = rgb(0.82, 0.17, 0.17);

type TimeEntryReportRow = {
  createdAt: string;
  collaboratorName: string;
  description: string;
  hours: number;
  rate: number;
  totalCost: number;
};

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
  const validationResult = projectConsuntivoReportValidation.safeParse(payload);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: "Dati richiesta non validi", details: validationResult.error.flatten() },
      { status: 400 },
    );
  }

  const { taskId } = validationResult.data;
  const supabase = createServiceClient();

  const { data: task, error: taskError } = await supabase
    .from("Task")
    .select(
      `
      *,
      client:Client!clientId(
        id,
        businessName,
        individualFirstName,
        individualLastName,
        address,
        city,
        zipCode,
        email,
        mobilePhone,
        landlinePhone
      ),
      column:KanbanColumn!kanbanColumnId(
        id,
        title
      ),
      kanban:Kanban!kanbanId(
        id,
        title
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

  const [{ data: timeEntries, error: timeEntriesError }, { data: errorEntries, error: errorEntriesError }] =
    await Promise.all([
      supabase
        .from("Timetracking")
        .select(
          `
          id,
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
        `,
        )
        .eq("site_id", siteContext.siteId)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
      supabase
        .from("Errortracking")
        .select("id, material_cost, created_at")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
    ]);

  if (timeEntriesError || errorEntriesError) {
    return NextResponse.json(
      {
        error: "Errore nel recupero dei dati consuntivi",
        details: timeEntriesError?.message || errorEntriesError?.message,
      },
      { status: 500 },
    );
  }

  const collaborators = buildCollaboratorTimeSummaries(timeEntries || []);
  const registeredMaterialCost = (errorEntries || []).reduce(
    (sum, entry) => sum + Number(entry.material_cost || 0),
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

  const detailRows: TimeEntryReportRow[] = (timeEntries || []).map((entry: any) => {
    const user = Array.isArray(entry.user) ? entry.user[0] : entry.user;
    const collaboratorName =
      `${user?.given_name || ""} ${user?.family_name || ""}`.trim() ||
      "Collaboratore";
    const employeeId =
      entry.employee_id != null
        ? String(entry.employee_id)
        : user?.id != null
          ? String(user.id)
          : collaboratorName;
    const hourlyRate =
      snapshot.collaboratorRates[employeeId] ?? snapshot.defaultHourlyRate;
    const hours = getEntryHours(entry);

    return {
      createdAt: entry.created_at,
      collaboratorName,
      description: entry.description || "-",
      hours,
      rate: hourlyRate,
      totalCost: Math.round((hours * hourlyRate + Number.EPSILON) * 100) / 100,
    };
  });

  const clientName =
    task.client?.businessName ||
    `${task.client?.individualLastName || ""} ${task.client?.individualFirstName || ""}`.trim() ||
    "Cliente";
  const clientAddress = [
    task.client?.address,
    task.client?.zipCode ? String(task.client.zipCode) : null,
    task.client?.city,
  ]
    .filter(Boolean)
    .join(", ");
  const clientContact =
    task.client?.email ||
    task.client?.mobilePhone ||
    task.client?.landlinePhone ||
    "-";
  const siteName = siteContext.siteData?.name || "Santini Manager";

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBuffer = await getPdfLogoBuffer(siteContext.siteData?.logo);
  const logoImage = logoBuffer ? await pdfDoc.embedPng(logoBuffer) : null;

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 18;
  let detailSectionActive = false;

  const drawTopHeader = (currentPage: PDFPage, isFirstPage: boolean) => {
    const projectCode = task.unique_code ? `#${task.unique_code}` : `#${task.id}`;
    drawPdfReportHeader({
      page: currentPage,
      fontRegular,
      fontBold,
      siteName,
      title: isFirstPage
        ? "Report consuntivo progetto"
        : "Report consuntivo progetto - dettaglio",
      documentCode: projectCode,
      logoImage,
      subtitle: "Layout standard report Santini Manager",
    });
  };

  const ensureSpace = (height: number) => {
    if (y - height < BOTTOM_MARGIN) {
      pages.push(page);
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawTopHeader(page, false);
      y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 18;
      if (detailSectionActive) {
        drawEntriesHeader(page, y);
        y -= 24;
      }
    }
  };

  const drawLabeledBlock = (
    currentPage: PDFPage,
    x: number,
    currentY: number,
    label: string,
    value: string,
    width: number,
  ) => {
    currentPage.drawText(label.toUpperCase(), {
      x,
      y: currentY,
      size: 8,
      font: fontBold,
      color: BRAND_MUTED,
    });
    const lines = wrapPdfText(value || "-", fontBold, 12, width);
    lines.forEach((line, index) => {
      currentPage.drawText(line, {
        x,
        y: currentY - 16 - index * 14,
        size: 12,
        font: fontBold,
        color: BRAND,
      });
    });
    return currentY - 16 - (lines.length - 1) * 14 - 8;
  };

  const drawMetricCard = (
    currentPage: PDFPage,
    x: number,
    currentY: number,
    width: number,
    label: string,
    value: string,
    emphasisColor = BRAND,
  ) => {
    currentPage.drawRectangle({
      x,
      y: currentY - 54,
      width,
      height: 54,
      borderWidth: 1,
      borderColor: SOFT_BORDER,
      color: SOFT_FILL_ALT,
    });
    currentPage.drawText(label.toUpperCase(), {
      x: x + 12,
      y: currentY - 16,
      size: 8,
      font: fontBold,
      color: BRAND_MUTED,
    });
    currentPage.drawText(value, {
      x: x + 12,
      y: currentY - 36,
      size: 14,
      font: fontBold,
      color: emphasisColor,
    });
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(22);
    page.drawText(title, {
      x: PAGE_MARGIN,
      y,
      size: 12,
      font: fontBold,
      color: BRAND,
    });
    y -= 18;
  };

  function drawEntriesHeader(currentPage: PDFPage, currentY: number) {
    currentPage.drawRectangle({
      x: PAGE_MARGIN,
      y: currentY - 14,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      height: 18,
      color: SOFT_FILL,
      borderColor: SOFT_BORDER,
      borderWidth: 1,
    });

    const columns = [
      { label: "Data", x: PAGE_MARGIN + 8 },
      { label: "Collaboratore", x: PAGE_MARGIN + 62 },
      { label: "Descrizione", x: PAGE_MARGIN + 188 },
      { label: "Ore", x: PAGE_MARGIN + 400 },
      { label: "Tariffa", x: PAGE_MARGIN + 446 },
      { label: "Totale", x: PAGE_MARGIN + 510 },
    ];

    columns.forEach((column) => {
      currentPage.drawText(column.label, {
        x: column.x,
        y: currentY - 8,
        size: 8,
        font: fontBold,
        color: BRAND_MUTED,
      });
    });
  }

  drawTopHeader(page, true);

  page.drawText("Cliente", {
    x: PAGE_MARGIN,
    y,
    size: 9,
    font: fontBold,
    color: BRAND_MUTED,
  });
  page.drawText("Progetto", {
    x: PAGE_MARGIN + 280,
    y,
    size: 9,
    font: fontBold,
    color: BRAND_MUTED,
  });
  y -= 14;

  const leftColumnBottom = drawLabeledBlock(
    page,
    PAGE_MARGIN,
    y,
    "Cliente",
    clientName,
    220,
  );
  const leftAddressBottom = drawLabeledBlock(
    page,
    PAGE_MARGIN,
    leftColumnBottom - 4,
    "Indirizzo",
    clientAddress || "-",
    220,
  );
  const leftContactBottom = drawLabeledBlock(
    page,
    PAGE_MARGIN,
    leftAddressBottom - 4,
    "Contatto",
    clientContact,
    220,
  );

  const rightBottomA = drawLabeledBlock(
    page,
    PAGE_MARGIN + 280,
    y,
    "Commessa / oggetto",
    task.name || task.title || "-",
    220,
  );
  const rightBottomB = drawLabeledBlock(
    page,
    PAGE_MARGIN + 280,
    rightBottomA - 4,
    "Fase",
    task.column?.title || task.kanban?.title || "-",
    220,
  );
  const rightBottomC = drawLabeledBlock(
    page,
    PAGE_MARGIN + 280,
    rightBottomB - 4,
    "Consegna",
    formatReportDate(task.deliveryDate),
    220,
  );

  y = Math.min(leftContactBottom, rightBottomC) - 18;

  const metricWidth = (PAGE_WIDTH - PAGE_MARGIN * 2 - 24) / 4;
  drawMetricCard(
    page,
    PAGE_MARGIN,
    y,
    metricWidth,
    "Ore consuntivate",
    formatHours(snapshot.totalTrackedHours),
  );
  drawMetricCard(
    page,
    PAGE_MARGIN + metricWidth + 8,
    y,
    metricWidth,
    "Costo lavoro",
    formatSwissCurrency(snapshot.totalLaborCost),
  );
  drawMetricCard(
    page,
    PAGE_MARGIN + (metricWidth + 8) * 2,
    y,
    metricWidth,
    "Costo materiale",
    formatSwissCurrency(snapshot.totalMaterialCost),
  );
  drawMetricCard(
    page,
    PAGE_MARGIN + (metricWidth + 8) * 3,
    y,
    metricWidth,
    "Margine",
    formatSwissCurrency(snapshot.margin),
    snapshot.margin >= 0 ? GREEN : RED,
  );
  y -= 72;

  drawSectionTitle("Riepilogo economico");
  const economicRows = [
    ["Valore commessa", formatSwissCurrency(snapshot.projectValue)],
    ["Tariffa oraria base", `${formatSwissCurrency(snapshot.defaultHourlyRate)} / h`],
    ["Materiale da errortracking", formatSwissCurrency(snapshot.registeredMaterialCost)],
    ["Materiale extra consuntivo", formatSwissCurrency(snapshot.manualMaterialCost)],
    ["Totale materiale", formatSwissCurrency(snapshot.totalMaterialCost)],
    ["Totale lavoro", formatSwissCurrency(snapshot.totalLaborCost)],
    ["Costo complessivo", formatSwissCurrency(snapshot.totalProjectCost)],
    ["Margine residuo", formatSwissCurrency(snapshot.margin)],
  ];

  economicRows.forEach(([label, value], index) => {
    ensureSpace(18);
    if (index % 2 === 0) {
      page.drawRectangle({
        x: PAGE_MARGIN,
        y: y - 4,
        width: PAGE_WIDTH - PAGE_MARGIN * 2,
        height: 18,
        color: rgb(0.985, 0.988, 0.992),
      });
    }
    page.drawText(label, {
      x: PAGE_MARGIN + 8,
      y,
      size: 10,
      font: fontRegular,
      color: BRAND,
    });
    const valueWidth = fontBold.widthOfTextAtSize(value, 10);
    page.drawText(value, {
      x: PAGE_WIDTH - PAGE_MARGIN - valueWidth - 8,
      y,
      size: 10,
      font: fontBold,
      color: BRAND,
    });
    y -= 18;
  });

  y -= 10;
  drawSectionTitle("Collaboratori");
  if (snapshot.collaborators.length === 0) {
    page.drawText("Nessuna registrazione ore collegata a questo progetto.", {
      x: PAGE_MARGIN,
      y,
      size: 10,
      font: fontRegular,
      color: BRAND_MUTED,
    });
    y -= 18;
  } else {
    ensureSpace(42);
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - 14,
      width: PAGE_WIDTH - PAGE_MARGIN * 2,
      height: 18,
      color: SOFT_FILL,
      borderColor: SOFT_BORDER,
      borderWidth: 1,
    });
    [
      { label: "Collaboratore", x: PAGE_MARGIN + 8 },
      { label: "Rapporti", x: PAGE_MARGIN + 250 },
      { label: "Ore", x: PAGE_MARGIN + 320 },
      { label: "Tariffa", x: PAGE_MARGIN + 390 },
      { label: "Totale", x: PAGE_MARGIN + 470 },
    ].forEach(({ label, x }) => {
      page.drawText(label, {
        x,
        y: y - 8,
        size: 8,
        font: fontBold,
        color: BRAND_MUTED,
      });
    });
    y -= 24;

    snapshot.collaborators.forEach((collaborator, index) => {
      ensureSpace(18);
      if (index % 2 === 0) {
        page.drawRectangle({
          x: PAGE_MARGIN,
          y: y - 4,
          width: PAGE_WIDTH - PAGE_MARGIN * 2,
          height: 18,
          color: rgb(0.985, 0.988, 0.992),
        });
      }
      page.drawText(collaborator.name, {
        x: PAGE_MARGIN + 8,
        y,
        size: 10,
        font: fontRegular,
        color: BRAND,
      });
      page.drawText(String(collaborator.entries), {
        x: PAGE_MARGIN + 256,
        y,
        size: 10,
        font: fontRegular,
        color: BRAND,
      });
      page.drawText(formatHours(collaborator.hours), {
        x: PAGE_MARGIN + 320,
        y,
        size: 10,
        font: fontRegular,
        color: BRAND,
      });
      page.drawText(formatSwissCurrency(collaborator.hourlyRate), {
        x: PAGE_MARGIN + 390,
        y,
        size: 10,
        font: fontRegular,
        color: collaborator.usesCustomRate ? GREEN : BRAND,
      });
      const totalText = formatSwissCurrency(collaborator.totalCost);
      const totalWidth = fontBold.widthOfTextAtSize(totalText, 10);
      page.drawText(totalText, {
        x: PAGE_WIDTH - PAGE_MARGIN - totalWidth - 8,
        y,
        size: 10,
        font: fontBold,
        color: BRAND,
      });
      y -= 18;
    });
  }

  y -= 10;
  drawSectionTitle("Dettaglio registrazioni ore");
  ensureSpace(42);
  detailSectionActive = true;
  drawEntriesHeader(page, y);
  y -= 24;

  if (detailRows.length === 0) {
    ensureSpace(18);
    page.drawText("Nessuna registrazione disponibile nel consuntivo.", {
      x: PAGE_MARGIN,
      y,
      size: 10,
      font: fontRegular,
      color: BRAND_MUTED,
    });
    y -= 18;
  } else {
    detailRows.forEach((row, index) => {
      const descriptionLines = wrapPdfText(
        row.description,
        fontRegular,
        9,
        200,
      ).slice(0, 3);
      const rowHeight = Math.max(18, descriptionLines.length * 11 + 4);
      ensureSpace(rowHeight + 2);

      if (index % 2 === 0) {
        page.drawRectangle({
          x: PAGE_MARGIN,
          y: y - rowHeight + 4,
          width: PAGE_WIDTH - PAGE_MARGIN * 2,
          height: rowHeight,
          color: rgb(0.985, 0.988, 0.992),
        });
      }

      page.drawText(formatReportDate(row.createdAt), {
        x: PAGE_MARGIN + 8,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      page.drawText(row.collaboratorName, {
        x: PAGE_MARGIN + 62,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      descriptionLines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: PAGE_MARGIN + 188,
          y: y - lineIndex * 11,
          size: 9,
          font: fontRegular,
          color: BRAND,
        });
      });
      page.drawText(formatHours(row.hours), {
        x: PAGE_MARGIN + 400,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      page.drawText(formatSwissCurrency(row.rate), {
        x: PAGE_MARGIN + 446,
        y,
        size: 9,
        font: fontRegular,
        color: BRAND,
      });
      const totalText = formatSwissCurrency(row.totalCost);
      const totalWidth = fontBold.widthOfTextAtSize(totalText, 9);
      page.drawText(totalText, {
        x: PAGE_WIDTH - PAGE_MARGIN - totalWidth - 8,
        y,
        size: 9,
        font: fontBold,
        color: BRAND,
      });
      y -= rowHeight;
    });
  }

  pages.push(page);
  pages.forEach((currentPage, index) => {
    drawPdfFooter({
      page: currentPage,
      pageNumber: index + 1,
      totalPages: pages.length,
      fontRegular,
    });
  });

  const pdfBytes = await pdfDoc.save();
  const filenameBase = sanitizeReportFilename(
    `report-consuntivo-${task.unique_code || task.name || task.id}`,
  );

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${filenameBase || `consuntivo-${task.id}`}.pdf\"`,
      "Cache-Control": "no-store",
    },
  });
}
