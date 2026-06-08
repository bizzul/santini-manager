"use client";

import dynamic from "next/dynamic";
import type { DocumentoArricchito } from "@/validation/documenti/extracted-document";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import { hasPdfmeOverlay } from "@/lib/documenti/default-pdfme-template";
import { HtmlDocumentPreview } from "@/components/documenti/document-preview-html";

const PdfmeDocumentPreview = dynamic(
  () =>
    import("@/components/document-template/pdfme-document-preview").then(
      (m) => m.PdfmeDocumentPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Caricamento anteprima…
      </div>
    ),
  },
);

interface DocumentPreviewProps {
  documento: DocumentoArricchito;
  template: DocumentTemplate;
  numero?: string | null;
  dataDocumento?: string;
  size?: "compact" | "full";
}

export function DocumentPreview(props: DocumentPreviewProps) {
  if (hasPdfmeOverlay(props.template)) {
    return <PdfmeDocumentPreview {...props} />;
  }
  return <HtmlDocumentPreview {...props} />;
}
