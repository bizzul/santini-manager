import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "@pdfme/pdf-lib";
import { createClient } from "../../../../utils/supabase/server";
import { getSiteContextFromDomain } from "@/lib/site-context";
import { logger } from "@/lib/logger";
import {
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

type PackingItem = {
  name?: string | null;
  number?: number | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const POST = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    const inputData = await req.json();
    const taskNumber = inputData?.data?.task
      ? Number(inputData.data.task)
      : undefined;

    if (!taskNumber) {
      return NextResponse.json(
        { error: "Task non valido" },
        { status: 400 },
      );
    }

    const packingEntries = Array.isArray(inputData?.data?.imballaggioData)
      ? inputData.data.imballaggioData
      : [];
    const latestPackingEntry = packingEntries[0];
    const packingItems: PackingItem[] = Array.isArray(latestPackingEntry?.items)
      ? latestPackingEntry.items
      : [];

    const { data: task, error: taskError } = await supabase
      .from("Task")
      .select(`
        *,
        clients:clientId(*)
      `)
      .eq("id", taskNumber)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Progetto non trovato" },
        { status: 404 },
      );
    }

    const siteDomain = req.headers.get("x-site-domain");
    const siteContext = siteDomain
      ? await getSiteContextFromDomain(siteDomain)
      : { siteData: null };
    const siteName = siteContext.siteData?.name || "Santini Manager";

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoBuffer = await getPdfLogoBuffer(siteContext.siteData?.logo);
    const logoImage = logoBuffer ? await pdfDoc.embedPng(logoBuffer) : null;
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const isGerman = task.clients?.client_language === "Tedesco";
    const labels = isGerman
      ? {
          title: "Verpackungsbericht",
          subtitle: "Standardisiertes Exportlayout",
          client: "Kunde",
          project: "Projekt",
          status: "Status",
          date: "Datum",
          detail: "Verpackungsdetails",
          item: "Element",
          quantity: "Menge",
          total: "Gesamtteile",
          empty: "Keine Verpackungsdaten fur dieses Projekt vorhanden.",
        }
      : {
          title: "Report imballaggio progetto",
          subtitle: "Layout standard report Santini Manager",
          client: "Cliente",
          project: "Progetto",
          status: "Stato",
          date: "Data",
          detail: "Dettaglio imballaggio",
          item: "Voce",
          quantity: "Quantita",
          total: "Totale pezzi",
          empty: "Nessun dato di imballaggio disponibile per questo progetto.",
        };

    const projectCode = task.unique_code || `progetto-${task.id}`;
    drawPdfReportHeader({
      page,
      fontRegular,
      fontBold,
      siteName,
      title: labels.title,
      subtitle: labels.subtitle,
      documentCode: projectCode,
      logoImage,
    });

    const clientName =
      task.clients?.business_name ||
      `${task.clients?.individual_last_name || ""} ${task.clients?.individual_first_name || ""}`.trim() ||
      "Cliente";
    const reportDate = formatReportDate(
      latestPackingEntry?.created_at || new Date(),
    );
    const reportStatus = latestPackingEntry?.passed === "DONE"
      ? isGerman
        ? "Abgeschlossen"
        : "Completo"
      : isGerman
        ? "In Bearbeitung"
        : "In corso";

    let y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 28;
    const drawField = (label: string, value: string, x: number, width: number) => {
      page.drawText(label.toUpperCase(), {
        x,
        y,
        size: 8,
        font: fontBold,
        color: BRAND_MUTED,
      });
      const lines = wrapPdfText(value || "-", fontBold, 12, width);
      lines.forEach((line, index) => {
        page.drawText(line, {
          x,
          y: y - 16 - index * 14,
          size: 12,
          font: fontBold,
          color: BRAND,
        });
      });
    };

    drawField(labels.client, clientName, PAGE_MARGIN, 220);
    drawField(labels.project, task.name || "-", PAGE_MARGIN + 250, 220);
    y -= 54;
    drawField(labels.status, reportStatus, PAGE_MARGIN, 220);
    drawField(labels.date, reportDate, PAGE_MARGIN + 250, 220);
    y -= 84;

    page.drawText(labels.detail, {
      x: PAGE_MARGIN,
      y,
      size: 13,
      font: fontBold,
      color: BRAND,
    });
    y -= 22;

    const tableX = PAGE_MARGIN;
    const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    page.drawRectangle({
      x: tableX,
      y: y - 18,
      width: tableWidth,
      height: 22,
      color: SOFT_FILL,
      borderWidth: 1,
      borderColor: SOFT_BORDER,
    });
    page.drawText(labels.item, {
      x: tableX + 8,
      y: y - 10,
      size: 9,
      font: fontBold,
      color: BRAND_MUTED,
    });
    page.drawText(labels.quantity, {
      x: PAGE_WIDTH - PAGE_MARGIN - 80,
      y: y - 10,
      size: 9,
      font: fontBold,
      color: BRAND_MUTED,
    });
    y -= 30;

    if (packingItems.length === 0) {
      page.drawRectangle({
        x: tableX,
        y: y - 22,
        width: tableWidth,
        height: 24,
        borderWidth: 1,
        borderColor: SOFT_BORDER,
        color: rgb(1, 1, 1),
      });
      page.drawText(labels.empty, {
        x: tableX + 8,
        y: y - 10,
        size: 10,
        font: fontRegular,
        color: BRAND_MUTED,
      });
      y -= 30;
    } else {
      packingItems.forEach((item, index) => {
        const rowHeight = 22;
        page.drawRectangle({
          x: tableX,
          y: y - rowHeight + 8,
          width: tableWidth,
          height: rowHeight,
          borderWidth: 1,
          borderColor: SOFT_BORDER,
          color: index % 2 === 0 ? rgb(1, 1, 1) : SOFT_FILL,
        });
        page.drawText(item.name || "-", {
          x: tableX + 8,
          y: y - 10,
          size: 10,
          font: fontRegular,
          color: BRAND,
        });
        const quantityText = String(toNumber(item.number));
        page.drawText(quantityText, {
          x: PAGE_WIDTH - PAGE_MARGIN - 72,
          y: y - 10,
          size: 10,
          font: fontBold,
          color: BRAND,
        });
        y -= rowHeight + 4;
      });
    }

    const totalPieces = packingItems.reduce(
      (sum, item) => sum + toNumber(item.number),
      0,
    );
    page.drawRectangle({
      x: PAGE_WIDTH - PAGE_MARGIN - 180,
      y: y - 36,
      width: 180,
      height: 36,
      color: BRAND,
    });
    page.drawText(labels.total, {
      x: PAGE_WIDTH - PAGE_MARGIN - 168,
      y: y - 14,
      size: 9,
      font: fontBold,
      color: rgb(0.9, 0.93, 0.98),
    });
    page.drawText(String(totalPieces), {
      x: PAGE_WIDTH - PAGE_MARGIN - 168,
      y: y - 28,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    drawPdfFooter({
      page,
      pageNumber: 1,
      totalPages: 1,
      fontRegular,
    });

    const pdfBytes = await pdfDoc.save();
    const filename = `${sanitizeReportFilename(`report-imballaggio-${projectCode}`)}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    logger.error("Errore generazione PDF imballaggio", error);
    return NextResponse.json(
      {
        error: "PDF Generation Failed",
        message: error.message,
      },
      { status: 500 },
    );
  }
};
