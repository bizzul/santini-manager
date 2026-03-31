import ExcelJS from "exceljs";

const BRAND_FILL = "FF172136";
const BRAND_ACCENT_FILL = "FFE9EEF5";
const SURFACE_FILL = "FFF7F9FC";
const HEADER_TEXT = "FFFFFFFF";
const MUTED_TEXT = "FF586678";
const BORDER = {
  top: { style: "thin" as const, color: { argb: "FFD9E1EA" } },
  left: { style: "thin" as const, color: { argb: "FFD9E1EA" } },
  bottom: { style: "thin" as const, color: { argb: "FFD9E1EA" } },
  right: { style: "thin" as const, color: { argb: "FFD9E1EA" } },
};

function formatDateTime(value: Date) {
  return value.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLastColumnLetter(worksheet: ExcelJS.Worksheet) {
  return worksheet.getColumn(Math.max(worksheet.columnCount, 1)).letter || "A";
}

function applyFill(row: ExcelJS.Row, columnCount: number, argb: string) {
  for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
    row.getCell(columnIndex).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    };
  }
}

export function setWorkbookDefaults(workbook: ExcelJS.Workbook, title: string) {
  const now = new Date();
  workbook.creator = "Santini Manager";
  workbook.company = "Santini Manager";
  workbook.created = now;
  workbook.modified = now;
  workbook.subject = title;
  workbook.title = title;
}

export function addWorkbookReportHeader(
  worksheet: ExcelJS.Worksheet,
  options: {
    title: string;
    subtitle: string;
    metaLines?: Array<string | null | undefined>;
    generatedAt?: Date;
  },
) {
  const metaLine = [
    `Generato il ${formatDateTime(options.generatedAt || new Date())}`,
    ...(options.metaLines || []).filter(
      (line): line is string => typeof line === "string" && line.trim().length > 0,
    ),
  ].join(" | ");

  worksheet.insertRows(1, [
    [options.title],
    [options.subtitle],
    [metaLine],
    [],
  ]);

  const lastColumnLetter = getLastColumnLetter(worksheet);
  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  worksheet.mergeCells(`A3:${lastColumnLetter}3`);

  const titleRow = worksheet.getRow(1);
  titleRow.height = 26;
  titleRow.font = { bold: true, color: { argb: HEADER_TEXT }, size: 16 };
  titleRow.alignment = { vertical: "middle", horizontal: "left" };
  applyFill(titleRow, worksheet.columnCount, BRAND_FILL);

  const subtitleRow = worksheet.getRow(2);
  subtitleRow.height = 22;
  subtitleRow.font = { color: { argb: MUTED_TEXT }, size: 11 };
  subtitleRow.alignment = { vertical: "middle", horizontal: "left" };
  applyFill(subtitleRow, worksheet.columnCount, BRAND_ACCENT_FILL);

  const metaRow = worksheet.getRow(3);
  metaRow.height = 20;
  metaRow.font = { color: { argb: MUTED_TEXT }, size: 10, italic: true };
  metaRow.alignment = { vertical: "middle", horizontal: "left" };
  applyFill(metaRow, worksheet.columnCount, SURFACE_FILL);

  worksheet.getRow(4).height = 8;
}

export function styleWorkbookTable(
  worksheet: ExcelJS.Worksheet,
  options: {
    headerRowNumber?: number;
    numericColumns?: string[];
    emphasizeProjectHeaders?: boolean;
  } = {},
) {
  const headerRowNumber = options.headerRowNumber || 5;
  const lastColumnLetter = getLastColumnLetter(worksheet);

  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  worksheet.autoFilter = `A${headerRowNumber}:${lastColumnLetter}${headerRowNumber}`;

  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.height = 22;

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const cell = headerRow.getCell(columnIndex);
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_FILL },
    };
    cell.border = BORDER;
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const values = Array.from({ length: worksheet.columnCount }, (_, index) =>
      row.getCell(index + 1).value,
    );
    const isEmptyRow = values.every(
      (value) => value === null || value === undefined || value === "",
    );
    if (isEmptyRow) return;

    for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
      const cell = row.getCell(columnIndex);
      cell.border = BORDER;
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
        horizontal: typeof cell.value === "number" ? "right" : "left",
      };
    }

    const firstCellValue = row.getCell(1).value;
    const secondCellValue = row.getCell(2).value;
    const thirdCellValue = row.getCell(3).value;
    const firstText = typeof firstCellValue === "string" ? firstCellValue : "";
    const isTotalRow =
      firstText.startsWith("Totale") || firstText === "Totale Ore";
    const isProjectHeaderRow =
      options.emphasizeProjectHeaders &&
      !!firstCellValue &&
      !secondCellValue &&
      !thirdCellValue;

    if (isTotalRow) {
      row.font = { bold: true };
      applyFill(
        row,
        worksheet.columnCount,
        firstText.startsWith("Totale mese") ? "FFDDEBD7" : "FFFCE9C8",
      );
      return;
    }

    if (isProjectHeaderRow) {
      row.font = { bold: true };
      applyFill(row, worksheet.columnCount, "FFDCE6F1");
      return;
    }

    const dataRowIndex = rowNumber - headerRowNumber;
    if (dataRowIndex % 2 === 0) {
      applyFill(row, worksheet.columnCount, SURFACE_FILL);
    }
  });

  options.numericColumns?.forEach((columnKey) => {
    const column = worksheet.getColumn(columnKey);
    column.numFmt = "0.00";
  });
}
