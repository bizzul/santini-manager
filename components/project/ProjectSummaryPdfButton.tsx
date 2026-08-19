"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { downloadResponseFile } from "@/lib/download-response-file";

interface ProjectSummaryPdfButtonProps {
  domain: string;
  taskId: number;
}

export function ProjectSummaryPdfButton({
  domain,
  taskId,
}: ProjectSummaryPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
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

      await downloadResponseFile(response, "riepilogo-progetto.pdf");
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

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      <FileDown className="mr-2 h-4 w-4" />
      {isDownloading ? "Generazione..." : "Esporta PDF"}
    </Button>
  );
}
