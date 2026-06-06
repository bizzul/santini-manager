import type { PDFPage, PDFFont } from "@pdfme/pdf-lib";
import {
  BRAND,
  BRAND_MUTED,
  PAGE_MARGIN,
  PAGE_WIDTH,
  wrapPdfText,
} from "@/lib/pdf-report-branding";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import type { TemplateStructureMap } from "@/lib/documenti/template-structure-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import { isCommercialType } from "@/lib/documenti/document-types";

type RigaPdfInput = DocumentoArricchito["righe"][number];

function formatMoney(value?: number | null): string {
  const safe = Number(value ?? 0);
  return safe.toLocaleString("it-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getSectionText(
  sectionId: string,
  documento: DocumentoArricchito,
  template: DocumentTemplate,
  numero: string,
  dataStr: string,
): string {
  const dest = documento.destinatario;
  switch (sectionId) {
    case "header":
      return [
        template.mittente.ragioneSociale,
        template.mittente.via,
        `${template.mittente.cap} ${template.mittente.citta}`,
        `IVA: ${template.mittente.iva}`,
      ].join("\n");
    case "destinatario":
      return [
        "Spettabile",
        dest.ragioneSociale,
        dest.aca ? `a.c.a ${dest.aca}` : null,
        dest.via,
        [dest.cap, dest.citta].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join("\n");
    case "oggetto":
      return `${documento.oggetto}${numero !== "—" ? ` (N° ${numero})` : ""}`;
    case "corpo":
      return documento.corpoTesto ?? "";
    case "tabella_righe":
      if (!isCommercialType(documento.tipoDocumento)) return "";
      return (documento.righe ?? [])
        .map(
          (r, i) =>
            `${i + 1}. ${r.descrizione} | Q:${r.quantita} ${r.unita} | CHF ${formatMoney(r.totaleRiga ?? r.quantita * r.prezzoUnitario)}`,
        )
        .join("\n");
    case "totali": {
      const t = documento.totali;
      if (!t) return "";
      return `Tot. Netto: CHF ${formatMoney(t.totNetto)}\nIVA 8.1%: CHF ${formatMoney(t.iva)}\nTotale CHF: ${formatMoney(t.totaleCHF)}`;
    }
    case "footer":
      return [
        template.banca.nome,
        `IBAN: ${template.banca.iban}`,
        documento.condizioniPagamento?.length
          ? `Condizioni: ${documento.condizioniPagamento.join("; ")}`
          : null,
        documento.termineFornitura
          ? `Termine fornitura: ${documento.termineFornitura}`
          : null,
        `Data: ${dataStr}`,
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return "";
  }
}

export function drawFromStructureMap(params: {
  page: PDFPage;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  structureMap: TemplateStructureMap;
  documento: DocumentoArricchito;
  template: DocumentTemplate;
  numero: string;
  dataStr: string;
  startY: number;
}): number {
  let y = params.startY;
  const sections = [...params.structureMap.sections].sort(
    (a, b) => a.order - b.order,
  );

  for (const section of sections) {
    const text = getSectionText(
      section.id,
      params.documento,
      params.template,
      params.numero,
      params.dataStr,
    );
    if (!text.trim()) continue;

    params.page.drawText(section.label, {
      x: PAGE_MARGIN,
      y,
      size: 10,
      font: params.fontBold,
      color: BRAND,
    });
    y -= 16;

    const lines = wrapPdfText(
      text,
      params.fontRegular,
      9,
      PAGE_WIDTH - PAGE_MARGIN * 2,
    );
    for (const line of lines) {
      params.page.drawText(line, {
        x: PAGE_MARGIN,
        y,
        size: 9,
        font: params.fontRegular,
        color: BRAND_MUTED,
      });
      y -= 12;
    }
    y -= 10;
  }

  return y;
}
