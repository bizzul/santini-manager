export interface ExtractedTemplateText {
  source: "pdf" | "docx" | "xlsx" | "text";
  content: string;
}

export async function extractTextFromTemplateBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedTemplateText> {
  const lowerName = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const parsed = await parser.getText();
      return { source: "pdf", content: parsed.text?.trim() ?? "" };
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    lowerName.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ buffer });
    return { source: "docx", content: result.value?.trim() ?? "" };
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  ) {
    const exceljsModule = await import("exceljs");
    const { Readable } = await import("stream");
    const workbook = new exceljsModule.Workbook();
    await workbook.xlsx.read(Readable.from(buffer));
    const parts: string[] = [];

    workbook.eachSheet((sheet) => {
      parts.push(`[Foglio: ${sheet.name}]`);
      const maxRows = Math.min(sheet.rowCount, 30);
      for (let r = 1; r <= maxRows; r++) {
        const row = sheet.getRow(r);
        const cells: string[] = [];
        row.eachCell({ includeEmpty: false }, (cell) => {
          const val = cell.value;
          if (val != null && String(val).trim()) {
            cells.push(String(val).trim());
          }
        });
        if (cells.length > 0) {
          parts.push(cells.join(" | "));
        }
      }
    });

    return { source: "xlsx", content: parts.join("\n").trim() };
  }

  if (mimeType === "text/plain" || lowerName.endsWith(".txt")) {
    return { source: "text", content: buffer.toString("utf-8").trim() };
  }

  throw new Error(
    "Formato non supportato per analisi template. Usa PDF, Word o Excel.",
  );
}
