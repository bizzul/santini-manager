"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, FileDown, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  downloadResponseFile,
  printPdfFromUrl,
} from "@/lib/download-response-file";

interface ProjectSummaryPdfButtonProps {
  domain: string;
  taskId: number;
  variant?: "default" | "outline";
  showPreview?: boolean;
  showDownload?: boolean;
}

async function fetchProjectSummaryPdf(domain: string, taskId: number) {
  const response = await fetch("/api/reports/project-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-site-domain": domain,
    },
    body: JSON.stringify({ taskId }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error || "Impossibile generare il PDF");
  }

  return response;
}

export function ProjectSummaryPdfButton({
  domain,
  taskId,
  variant = "default",
  showPreview = true,
  showDownload = true,
}: ProjectSummaryPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  previewUrlRef.current = previewUrl;

  const closePreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) window.URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!previewUrl) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewUrl, closePreview]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetchProjectSummaryPdf(domain, taskId);
      await downloadResponseFile(response, "scheda-progetto.pdf");
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante l'esportazione del PDF.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!previewUrl) return;
    setIsPrinting(true);
    try {
      printPdfFromUrl(previewUrl);
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante la stampa del PDF.",
      });
    } finally {
      window.setTimeout(() => setIsPrinting(false), 800);
    }
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const response = await fetchProjectSummaryPdf(domain, taskId);
      const blob = await response.blob();
      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      setPreviewUrl((current) => {
        if (current) window.URL.revokeObjectURL(current);
        return url;
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante l'anteprima del PDF.",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const busy = isDownloading || isPreviewing || isPrinting;

  const previewOverlay =
    mounted && previewUrl
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <p className="text-sm font-semibold">Anteprima scheda progetto</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  disabled={busy}
                  title="Stampa"
                  aria-label="Stampa"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isPrinting ? "Stampa..." : "Stampa"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={busy}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Scarica
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={closePreview}
                >
                  <X className="mr-2 h-4 w-4" />
                  Chiudi
                </Button>
              </div>
            </div>
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0`}
              title="Anteprima scheda progetto"
              className="min-h-0 flex-1 w-full bg-muted"
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex items-center gap-2">
        {showPreview ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePreview}
            disabled={busy}
          >
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewing ? "Anteprima..." : "Anteprima PDF"}
          </Button>
        ) : null}
        {showDownload ? (
          <Button
            type="button"
            size="sm"
            variant={variant}
            onClick={handleDownload}
            disabled={busy}
          >
            <FileDown className="mr-2 h-4 w-4" />
            {isDownloading ? "Generazione..." : "Esporta PDF"}
          </Button>
        ) : null}
      </div>
      {previewOverlay}
    </>
  );
}
