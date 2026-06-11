"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { downloadResponseFile } from "@/lib/download-response-file";

interface CollaboratorReportButtonProps {
  domain: string;
  userId: number;
}

/** Downloads the full collaborator PDF report (profile, hours, balances). */
export function CollaboratorReportButton({
  domain,
  userId,
}: CollaboratorReportButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/reports/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({ userId, format: "pdf" }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || "Impossibile generare il PDF");
      }

      await downloadResponseFile(response, `report-collaboratore-${userId}.pdf`);
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante il download del report collaboratore.",
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
      <Printer className="mr-2 h-4 w-4" />
      {isDownloading ? "Generazione..." : "Stampa report"}
    </Button>
  );
}

export default CollaboratorReportButton;
