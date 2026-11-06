import type { Template } from "@pdfme/common";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import { getDocumentTypeLabel, isCommercialType } from "@/lib/documenti/document-types";
import { templateHasSeparateNumeroDocumento } from "@/lib/documenti/letterhead-field-catalog";

function formatMoney(value?: number | null): string {
  const safe = Number(value ?? 0);
  return safe.toLocaleString("it-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date?: string | Date | null): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString("it-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function buildDestinatarioBlock(documento: DocumentoArricchito): string {
  const lines = [
    "Spettabile",
    documento.destinatario.ragioneSociale,
    documento.destinatario.aca
      ? `a.c.a ${documento.destinatario.aca}`
      : null,
    documento.destinatario.via,
    [documento.destinatario.cap, documento.destinatario.citta]
      .filter(Boolean)
      .join(" "),
    documento.destinatario.email,
  ].filter(Boolean) as string[];

  return lines.join("\n");
}

export function buildNumeroDocumentoLine(
  documento: DocumentoArricchito,
  numero?: string | null,
): string {
  const tipo = getDocumentTypeLabel(documento.tipoDocumento);
  const trimmed = documento.oggetto.trim();

  if (/N°:/i.test(trimmed)) {
    const match = trimmed.match(/^(.+?N°:\s*[\d\-./]+)/i);
    if (match) return match[1].trim();
  }

  if (isCommercialType(documento.tipoDocumento)) {
    return `${tipo} N°: ${numero ?? "—"}`;
  }

  return `${tipo}: ${numero ?? "—"}`;
}

export function buildOggettoTitolo(
  documento: DocumentoArricchito,
  numero?: string | null,
): string {
  const tipo = getDocumentTypeLabel(documento.tipoDocumento);
  const trimmed = documento.oggetto.trim();

  if (/N°:/i.test(trimmed)) {
    const parts = trimmed.split(/\s*-\s*/);
    if (parts.length > 1) {
      return parts.slice(1).join(" - ").trim();
    }
    return trimmed.replace(/^[^:]+:\s*/, "").trim() || trimmed;
  }

  if (isCommercialType(documento.tipoDocumento)) {
    return trimmed;
  }

  return `${tipo}: ${trimmed}`;
}

/** Formato legacy: tipo + numero + titolo in un unico campo. */
function buildOggettoLineCombined(
  documento: DocumentoArricchito,
  numero?: string | null,
): string {
  const tipo = getDocumentTypeLabel(documento.tipoDocumento);
  const trimmed = documento.oggetto.trim();

  if (/N°:/i.test(trimmed)) {
    return trimmed;
  }

  if (isCommercialType(documento.tipoDocumento)) {
    return `${tipo} N°: ${numero ?? "—"} - ${trimmed}`;
  }

  return `${tipo}: ${trimmed}`;
}

/**
 * Nelle offerte Santini reali il blocco descrittivo di un prodotto compare
 * UNA volta e sotto stanno le posizioni con le loro misure. Ripeterlo su
 * ogni riga gonfia il documento di pagine identiche: su nove serramenti
 * dello stesso tipo sarebbe lo stesso paragrafo nove volte.
 *
 * Quindi il testo base si stampa alla prima posizione che lo usa; dalla
 * seconda in poi restano descrizione e attributi. Nell'editor resta
 * visibile su tutte le righe, perche' li' serve a controllarlo e correggerlo.
 */
function separaTestoBase(descrizioneEstesa: string | null | undefined): {
  base: string | null;
  attributi: string | null;
} {
  const testo = descrizioneEstesa?.trim();
  if (!testo) return { base: null, attributi: null };
  const righe = testo.split("\n");
  if (righe.length === 1) {
    // Una riga sola: e' la riga attributi del vecchio formato.
    return righe[0].startsWith("Misure:") || righe[0].includes(" \u00b7 ")
      ? { base: null, attributi: righe[0] }
      : { base: righe[0], attributi: null };
  }
  return {
    base: righe.slice(0, -1).join("\n").trim() || null,
    attributi: righe[righe.length - 1].trim() || null,
  };
}

function buildTableRows(documento: DocumentoArricchito): string {
  const showDiscount = documento.tipoDocumento !== "FATTURA";
  const basiGiaStampate = new Set<string>();

  const rows = (documento.righe ?? []).map((riga) => {
    const { base: testoBase, attributi } = separaTestoBase(
      riga.descrizioneEstesa,
    );

    const parti: string[] = [riga.descrizione];
    if (testoBase && !basiGiaStampate.has(testoBase)) {
      basiGiaStampate.add(testoBase);
      parti.push(testoBase);
    }
    if (attributi) {
      parti.push(attributi);
    } else if (!testoBase && riga.misure?.trim()) {
      parti.push(`Misure: ${riga.misure}`);
    }
    const desc = parti.join("\n");

    const base = [
      riga.art ?? "—",
      desc,
      riga.unita ?? "—",
      String(riga.quantita ?? "—"),
      formatMoney(riga.prezzoUnitario),
    ];

    if (showDiscount) {
      base.push(riga.sconto != null ? `${riga.sconto}%` : "—");
    }

    base.push(formatMoney(riga.totaleRiga));
    return base;
  });

  return JSON.stringify(rows);
}

export interface MapDocumentoToPdfmeInputsOptions {
  numero?: string | null;
  createdAt?: string | null;
  pdfmeTemplate?: Template | null;
}

export function mapDocumentoToPdfmeInputs(
  documento: DocumentoArricchito,
  options: MapDocumentoToPdfmeInputsOptions = {},
): Record<string, string> {
  const { numero, createdAt, pdfmeTemplate } = options;
  const totali = documento.totali ?? { totNetto: 0, iva: 0, totaleCHF: 0 };
  const separateNumero = templateHasSeparateNumeroDocumento(pdfmeTemplate);

  const inputs: Record<string, string> = {
    destinatario: buildDestinatarioBlock(documento),
    data: formatDate(createdAt),
  };

  if (separateNumero) {
    inputs.numeroDocumento = buildNumeroDocumentoLine(documento, numero);
    inputs.oggetto = buildOggettoTitolo(documento, numero);
  } else {
    inputs.oggetto = buildOggettoLineCombined(documento, numero);
  }

  if (isCommercialType(documento.tipoDocumento)) {
    inputs.tabellaRighe = buildTableRows(documento);
    inputs.totaleNetto = `Tot. Netto: CHF ${formatMoney(totali.totNetto)}`;
    inputs.iva = `IVA 8.1%: CHF ${formatMoney(totali.iva)}`;
    inputs.totale = `Totale CHF: ${formatMoney(totali.totaleCHF)}`;
    inputs.condizioniPagamento =
      documento.condizioniPagamento.length > 0
        ? `Condizioni di pagamento:\n${documento.condizioniPagamento.join("\n")}`
        : "";
    inputs.termineFornitura = documento.termineFornitura
      ? `Termine di fornitura: ${documento.termineFornitura}`
      : "";
    if (documento.note?.trim()) {
      inputs.noteAggiuntive = documento.note.trim();
    }
  } else {
    inputs.corpoTesto = documento.corpoTesto ?? "";
  }

  return inputs;
}
