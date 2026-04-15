"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { downloadResponseFile } from "@/lib/download-response-file";

interface ProjectReportDownloadButtonProps {
  domain: string;
  taskId: number;
}

export function ProjectReportDownloadButton({
  domain,
  taskId,
}: ProjectReportDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/reports/project-consuntivo", {
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

      await downloadResponseFile(response, `report-progetto-${taskId}.pdf`);
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante il download del report progetto.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      <Download className="mr-2 h-4 w-4" />
      {isDownloading ? "Generazione..." : "Scarica report progetto"}
    </Button>
  );
}
