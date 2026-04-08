"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface ProjectStatusPanelProps {
  taskId: number;
  domain: string;
  deliveryDateValue: string | null;
  weekNumber: number | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  hasMaterial: boolean;
  kanbanTitle: string | null;
}

function normalizeDateValue(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ProjectStatusPanel({
  taskId,
  domain,
  deliveryDateValue,
  weekNumber,
  createdAtLabel,
  updatedAtLabel,
  hasMaterial,
  kanbanTitle,
}: ProjectStatusPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [deliveryDateInput, setDeliveryDateInput] = useState(
    normalizeDateValue(deliveryDateValue),
  );

  const formattedDeliveryLabel = useMemo(() => {
    if (!deliveryDateInput) return "Data non definita";
    const date = new Date(deliveryDateInput);
    if (Number.isNaN(date.getTime())) return "Data non definita";
    return date.toLocaleDateString("it-IT");
  }, [deliveryDateInput]);

  const saveDeliveryDate = async () => {
    setIsSavingDelivery(true);
    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          deliveryDate: deliveryDateInput || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.status >= 400 || payload?.message === "Internal server error") {
        throw new Error(payload?.error || payload?.message || "Errore aggiornamento consegna");
      }

      setIsEditingDelivery(false);
      toast({ description: "Data consegna aggiornata correttamente." });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Errore durante il salvataggio della consegna.",
      });
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const metaPanelClass =
    "rounded-xl border border-border bg-background/90 p-3.5 min-h-[84px] flex flex-col justify-between dark:border-slate-700 dark:bg-slate-800/50";

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-background p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Consegna
          </span>
          <div className="flex items-center gap-2">
            {weekNumber && (
              <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                S.{weekNumber}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (!isEditingDelivery) {
                  setDeliveryDateInput(normalizeDateValue(deliveryDateValue));
                }
                setIsEditingDelivery((current) => !current);
              }}
            >
              {isEditingDelivery ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="rounded-full bg-card p-2 shadow-sm dark:bg-slate-900">
            <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-300" />
          </div>
          <div className="flex-1">
            {isEditingDelivery ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={deliveryDateInput}
                  onChange={(event) => setDeliveryDateInput(event.target.value)}
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={saveDeliveryDate}
                  disabled={isSavingDelivery}
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  {isSavingDelivery ? "..." : "Salva"}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formattedDeliveryLabel}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data pianificata del progetto
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={metaPanelClass}>
          <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Creato
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {createdAtLabel}
          </span>
        </div>
        <div className={metaPanelClass}>
          <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Aggiornato
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {updatedAtLabel}
          </span>
        </div>
        <div className={metaPanelClass}>
          <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Materiale
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {hasMaterial ? "Sì" : "No"}
          </span>
        </div>
        <div className={metaPanelClass}>
          <span className="block text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Kanban
          </span>
          <span className="mt-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {kanbanTitle || "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

