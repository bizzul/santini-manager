"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Template } from "@pdfme/common";
import { getDefaultFont } from "@pdfme/common";
import { Viewer } from "@pdfme/ui";
import { PDFME_PLUGINS } from "@/lib/documenti/pdfme-plugins";
import { resolvePdfmeTemplateForRender } from "@/lib/documenti/default-pdfme-template";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import { mapDocumentoToPdfmeInputs } from "@/lib/documenti/map-documento-to-pdfme-inputs";
import { A4_PAGE_WIDTH_MM, A4_SHEET_MIN_HEIGHT_CSS } from "@/lib/documenti/page-format";

export type PdfmePreviewSize = "compact" | "full";

interface PdfmeDocumentPreviewProps {
  documento: DocumentoArricchito;
  template: DocumentTemplate;
  numero?: string | null;
  dataDocumento?: string;
  size?: PdfmePreviewSize;
}

export function PdfmeDocumentPreview({
  documento,
  template,
  numero,
  dataDocumento,
  size = "compact",
}: PdfmeDocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const pdfmeTemplate = useMemo(() => {
    if (!template.pdfmeTemplate) return null;
    return resolvePdfmeTemplateForRender(
      template.pdfmeTemplate,
      template.letterheadBasePdf?.url,
    );
  }, [template.pdfmeTemplate, template.letterheadBasePdf?.url]);

  const inputs = useMemo(() => {
    const mapped = mapDocumentoToPdfmeInputs(documento, {
      numero,
      createdAt: dataDocumento,
      pdfmeTemplate: template.pdfmeTemplate,
    });
    if (dataDocumento) {
      mapped.data = dataDocumento;
    }
    return [mapped];
  }, [documento, numero, dataDocumento]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdfmeTemplate) return;

    const viewer = new Viewer({
      domContainer: container,
      template: pdfmeTemplate,
      inputs,
      plugins: PDFME_PLUGINS,
      options: {
        font: getDefaultFont(),
        lang: "it",
      },
    });

    viewerRef.current = viewer;

    return () => {
      viewer.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinizializza al cambio basePdf
  }, [pdfmeTemplate?.basePdf]);

  useEffect(() => {
    viewerRef.current?.setInputs(inputs);
  }, [inputs]);

  if (!pdfmeTemplate) {
    return null;
  }

  const isFull = size === "full";

  return (
    <div
      className={isFull ? "w-full" : "mx-auto w-full"}
      style={{ maxWidth: isFull ? `${A4_PAGE_WIDTH_MM}mm` : `${A4_PAGE_WIDTH_MM}mm` }}
    >
      <div
        ref={containerRef}
        className="document-print-preview overflow-hidden rounded-lg border border-border bg-white"
        style={{
          minHeight: isFull ? A4_SHEET_MIN_HEIGHT_CSS : "min(297mm, 75vh)",
          width: isFull ? `${A4_PAGE_WIDTH_MM}mm` : undefined,
          maxWidth: "100%",
        }}
      />
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Anteprima A4 ({A4_PAGE_WIDTH_MM} × 297 mm) — identica al PDF
      </p>
    </div>
  );
}
