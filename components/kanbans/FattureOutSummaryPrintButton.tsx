"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { openResponsePdfPreview } from "@/lib/download-response-file";

export type FattureOutSummaryLane = "todo" | "inviata";

export type FattureOutSummaryPrintGroup = {
  title: string;
  taskIds: number[];
};

type FattureOutSummaryPrintButtonProps = {
  domain: string;
  lane: FattureOutSummaryLane;
  groups: FattureOutSummaryPrintGroup[];
};

export function FattureOutSummaryPrintButton({
  domain,
  lane,
  groups,
}: FattureOutSummaryPrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();
  const columnLabel = lane === "inviata" ? "Inviate" : "To Do";
  const taskCount = groups.reduce((sum, group) => sum + group.taskIds.length, 0);

  const handlePrint = async () => {
    if (taskCount === 0) {
      toast({
        description: `Nessuna fattura in ${columnLabel} da stampare.`,
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
        body: JSON.stringify({ lane, groups }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(
          errorPayload?.error || "Impossibile generare il riepilogo fatture",
        );
      }

      await openResponsePdfPreview(response, "riepilogo-fatture-out.pdf");
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
      title={`Anteprima PDF fatture ${columnLabel}`}
      aria-label={`Anteprima PDF fatture ${columnLabel}`}
    >
      {isPrinting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
    </button>
  );
}
