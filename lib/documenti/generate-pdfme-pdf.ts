import type { Template } from "@pdfme/common";
import { getDefaultFont } from "@pdfme/common";
import { generate } from "@pdfme/generator";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import { getDocumentTypeLabel } from "@/lib/documenti/document-types";
import { PDFME_PLUGINS } from "@/lib/documenti/pdfme-plugins";
import {
  mapDocumentoToPdfmeInputs,
  type MapDocumentoToPdfmeInputsOptions,
} from "@/lib/documenti/map-documento-to-pdfme-inputs";
import { resolvePdfmeTemplateForRender } from "@/lib/documenti/default-pdfme-template";
import { sanitizeReportFilename } from "@/lib/pdf-report-branding";

async function resolveBasePdfBytes(
  basePdf: Template["basePdf"],
): Promise<Uint8Array | Template["basePdf"]> {
  if (typeof basePdf !== "string") {
    return basePdf;
  }

  if (basePdf.startsWith("data:application/pdf")) {
    return basePdf;
  }

  const response = await fetch(basePdf);
  if (!response.ok) {
    throw new Error(
      `Impossibile caricare la carta intestata (${response.status})`,
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function generatePdfmeDocumentBytes(input: {
  documento: DocumentoArricchito;
  template: DocumentTemplate;
  numero?: string | null;
  createdAt?: string | null;
}): Promise<{ bytes: Uint8Array; filename: string }> {
  const { documento, template, numero, createdAt } = input;

  if (!template.pdfmeTemplate) {
    throw new Error("Template pdfme non configurato per questo sito");
  }

  const resolvedTemplate = resolvePdfmeTemplateForRender(
    template.pdfmeTemplate,
    template.letterheadBasePdf?.url,
  );

  const basePdfBytes = await resolveBasePdfBytes(resolvedTemplate.basePdf);
  const pdfmeTemplate: Template = {
    ...resolvedTemplate,
    basePdf: basePdfBytes,
  };

  const mapOptions: MapDocumentoToPdfmeInputsOptions = {
    numero,
    createdAt,
    pdfmeTemplate: resolvedTemplate,
  };
  const inputs = mapDocumentoToPdfmeInputs(documento, mapOptions);

  const bytes = await generate({
    template: pdfmeTemplate,
    inputs: [inputs],
    plugins: PDFME_PLUGINS,
    options: {
      font: getDefaultFont(),
    },
  });

  const tipoLabel = getDocumentTypeLabel(documento.tipoDocumento);
  const docCode = numero ?? "—";
  const slug = sanitizeReportFilename(
    `${tipoLabel}-${docCode}-${documento.destinatario.ragioneSociale}`,
  );
  const filename = `${slug || "documento"}.pdf`;

  return { bytes, filename };
}
