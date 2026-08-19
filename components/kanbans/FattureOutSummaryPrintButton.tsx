"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { downloadResponseFile } from "@/lib/download-response-file";

type FattureOutSummaryPrintButtonProps = {
  domain: string;
  taskIds: number[];
};

export function FattureOutSummaryPrintButton({
  domain,
  taskIds,
}: FattureOutSummaryPrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const handlePrint = async () => {
    if (taskIds.length === 0) {
      toast({
        description: "Nessuna fattura in To Do da stampare.",
      });
      return;
    }

    setIsPrinting(true);
    try {
      const response = await fetch("/api/reports/fatture-out-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({ taskIds }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error || "Impossibile generare il riepilogo fatture",
        );
      }

      await downloadResponseFile(response, "riepilogo-fatture-out.pdf");
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante la stampa del riepilogo fatture.",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      disabled={isPrinting}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
      title="Stampa riepilogo fatture To Do"
      aria-label="Stampa riepilogo fatture To Do"
    >
      {isPrinting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
    </button>
  );
}
