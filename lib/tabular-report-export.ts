import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "@pdfme/pdf-lib";
import {
  addWorkbookReportHeader,
  setWorkbookDefaults,
  styleWorkbookTable,
} from "@/lib/workbook-report-branding";
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
  getPdfLogoBuffer,
  sanitizeReportFilename,
  wrapPdfText,
} from "@/lib/pdf-report-branding";

type TabularCellValue = string | number | boolean | null | undefined | Date;

export interface TabularReportColumn<Row extends Record<string, unknown>> {
  key: keyof Row & string;
  header: string;
  width?: number;
  pdfWidth?: number;
  align?: "left" | "center" | "right";
  numeric?: boolean;
  format?: (value: Row[keyof Row], row: Row) => TabularCellValue;
}

interface CreateTabularReportResponseOptions<Row extends Record<string, unknown>> {
  title: string;
  subtitle: string;
  sheetName: string;
  filenameBase: string;
  columns: Array<TabularReportColumn<Row>>;
  rows: Row[];
  format?: "excel" | "pdf";
  metaLines?: string[];
  siteName?: string | null;
  logoUrl?: string | null;
  documentCode?: string;
}

function normalizeCellValue(value: TabularCellValue): string | number {
  if (value instanceof Date) {
    return value.toLocaleDateString("it-IT");
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function getColumnValue<Row extends Record<string, unknown>>(
  row: Row,
  column: TabularReportColumn<Row>,
): string | number {
  const rawValue = row[column.key];
  const formattedValue = column.format
    ? column.format(rawValue as Row[keyof Row], row)
    : (rawValue as TabularCellValue);

  return normalizeCellValue(formattedValue);
}

async function buildExcelBuffer<Row extends Record<string, unknown>>(
  options: CreateTabularReportResponseOptions<Row>,
) {
  const workbook = new ExcelJS.Workbook();
  setWorkbookDefaults(workbook, options.title);

  const worksheet = workbook.addWorksheet(options.sheetName);
  worksheet.columns = options.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 20,
  }));

  worksheet.addRows(
    options.rows.map((row) =>
      Object.fromEntries(
        options.columns.map((column) => [column.key, getColumnValue(row, column)]),
      ),
    ),
  );

  addWorkbookReportHeader(worksheet, {
    title: options.title,
    subtitle: options.subtitle,
    metaLines: options.metaLines,
  });
  styleWorkbookTable(worksheet, {
    headerRowNumber: 5,
    numericColumns: options.columns
      .filter((column) => column.numeric)
      .map((column) => column.key),
  });

  return workbook.xlsx.writeBuffer();
}

async function buildPdfBuffer<Row extends Record<string, unknown>>(
  options: CreateTabularReportResponseOptions<Row>,
) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBuffer = await getPdfLogoBuffer(options.logoUrl);
  const logoImage = logoBuffer ? await pdfDoc.embedPng(logoBuffer) : null;

  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const explicitWidth = options.columns.reduce(
    (accumulator, column) => accumulator + (column.pdfWidth || 0),
    0,
  );
  const fallbackWidth =
    explicitWidth > 0 ? 0 : tableWidth / Math.max(options.columns.length, 1);

  const columnWidths = options.columns.map((column) => column.pdfWidth || fallbackWidth);
  const columnPositions = columnWidths.map((_, columnIndex) => {
    const previousWidths = columnWidths
      .slice(0, columnIndex)
      .reduce((accumulator, width) => accumulator + width, 0);
    return PAGE_MARGIN + previousWidths;
  });

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 18;

  const drawHeader = (currentPage: PDFPage, firstPage: boolean) => {
    drawPdfReportHeader({
      page: currentPage,
      fontRegular,
      fontBold,
      siteName: options.siteName || "Santini Manager",
      title: options.title,
      subtitle: firstPage ? options.subtitle : `${options.subtitle} - continua`,
      documentCode: options.documentCode || "REPORT",
      logoImage,
    });
  };

  const drawTableHeader = (currentPage: PDFPage, currentY: number) => {
    currentPage.drawRectangle({
      x: PAGE_MARGIN,
      y: currentY - 16,
      width: tableWidth,
      height: 20,
      color: SOFT_FILL,
      borderColor: SOFT_BORDER,
      borderWidth: 1,
    });

    options.columns.forEach((column, index) => {
      currentPage.drawText(column.header, {
        x: columnPositions[index] + 4,
        y: currentY - 10,
        size: 8,
        font: fontBold,
        color: BRAND_MUTED,
      });
    });
  };

  const ensureSpace = (height: number) => {
    if (y - height >= BOTTOM_MARGIN) {
      return;
    }

    pages.push(page);
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader(page, false);
    y = PAGE_HEIGHT - TOP_HEADER_HEIGHT - 18;
    drawTableHeader(page, y);
    y -= 28;
  };

  drawHeader(page, true);

  const metaLines = options.metaLines || [];
  metaLines.forEach((line) => {
    page.drawText(line, {
      x: PAGE_MARGIN,
      y,
      size: 9,
      font: fontRegular,
      color: BRAND_MUTED,
    });
    y -= 14;
  });

  y -= 4;
  drawTableHeader(page, y);
  y -= 28;

  options.rows.forEach((row, rowIndex) => {
    const cellLines = options.columns.map((column, columnIndex) => {
      const value = String(getColumnValue(row, column));
      return wrapPdfText(value, fontRegular, 8.5, columnWidths[columnIndex] - 8);
    });
    const lineCount = Math.max(...cellLines.map((lines) => lines.length), 1);
    const rowHeight = Math.max(20, lineCount * 11 + 6);

    ensureSpace(rowHeight + 4);

    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: PAGE_MARGIN,
        y: y - rowHeight + 4,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.985, 0.988, 0.992),
      });
    }

    cellLines.forEach((lines, columnIndex) => {
      lines.forEach((line, lineIndex) => {
        const column = options.columns[columnIndex];
        const columnWidth = columnWidths[columnIndex];
        const textWidth = fontRegular.widthOfTextAtSize(line, 8.5);
        const baseX = columnPositions[columnIndex] + 4;
        const alignedX =
          column.align === "right"
            ? columnPositions[columnIndex] + columnWidth - textWidth - 4
            : column.align === "center"
              ? columnPositions[columnIndex] + (columnWidth - textWidth) / 2
              : baseX;

        page.drawText(line, {
          x: alignedX,
          y: y - lineIndex * 11,
          size: 8.5,
          font: fontRegular,
          color: BRAND,
        });
      });
    });

    y -= rowHeight;
  });

  pages.push(page);
  pages.forEach((currentPage, index) => {
    drawPdfFooter({
      page: currentPage,
      pageNumber: index + 1,
      totalPages: pages.length,
      fontRegular,
    });
  });

  return pdfDoc.save();
}

export async function createTabularReportResponse<Row extends Record<string, unknown>>(
  options: CreateTabularReportResponseOptions<Row>,
) {
  const format = options.format === "pdf" ? "pdf" : "excel";
  const safeFilename = sanitizeReportFilename(options.filenameBase) || "report";

  if (format === "pdf") {
    const pdfBytes = await buildPdfBuffer(options);
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const excelBuffer = await buildExcelBuffer(options);
  return new Response(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeFilename}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
