"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Save, RotateCcw, Clock3, Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { downloadResponseFile } from "@/lib/download-response-file";
import {
  buildProjectCostSnapshot,
  DEFAULT_PROJECT_HOURLY_RATE,
  formatHours,
  formatSwissCurrency,
  type CollaboratorTimeSummary,
} from "@/lib/project-consuntivo";

interface ProjectConsuntivoSummaryProps {
  domain: string;
  taskId: number;
  projectValue: number;
  registeredMaterialCost: number;
  initialManualMaterialCost?: number | null;
  initialDefaultHourlyRate?: number | null;
  initialCollaboratorRates?: Record<string, number> | null;
  collaborators: CollaboratorTimeSummary[];
  timeEntriesCount: number;
  latestTimeEntryLabel?: string | null;
}

function toPositiveNumber(value: string, fallback = 0): number {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeRateMap(
  rateValues: Record<string, string>,
  defaultHourlyRate: number,
): Record<string, number> {
  return Object.entries(rateValues).reduce<Record<string, number>>(
    (accumulator, [employeeId, rawValue]) => {
      const rate = toPositiveNumber(rawValue, defaultHourlyRate);
      if (rate > 0 && Math.abs(rate - defaultHourlyRate) >= 0.005) {
        accumulator[employeeId] = Math.round(rate * 100) / 100;
      }
      return accumulator;
    },
    {},
  );
}

function buildInitials(name: string): string {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "CL";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function ProjectConsuntivoSummary({
  domain,
  taskId,
  projectValue,
  registeredMaterialCost,
  initialManualMaterialCost = 0,
  initialDefaultHourlyRate = DEFAULT_PROJECT_HOURLY_RATE,
  initialCollaboratorRates = {},
  collaborators,
  timeEntriesCount,
  latestTimeEntryLabel,
}: ProjectConsuntivoSummaryProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [manualMaterialCostInput, setManualMaterialCostInput] = useState(
    String(initialManualMaterialCost || 0),
  );
  const [defaultHourlyRateInput, setDefaultHourlyRateInput] = useState(
    String(initialDefaultHourlyRate || DEFAULT_PROJECT_HOURLY_RATE),
  );
  const [collaboratorRateInputs, setCollaboratorRateInputs] = useState<
    Record<string, string>
  >(
    Object.entries(initialCollaboratorRates || {}).reduce<Record<string, string>>(
      (accumulator, [employeeId, rate]) => {
        accumulator[employeeId] = String(rate);
        return accumulator;
      },
      {},
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const normalizedDefaultRate = Math.max(
    0.01,
    toPositiveNumber(defaultHourlyRateInput, DEFAULT_PROJECT_HOURLY_RATE),
  );
  const normalizedManualMaterialCost = toPositiveNumber(manualMaterialCostInput, 0);
  const normalizedRateMap = useMemo(
    () => normalizeRateMap(collaboratorRateInputs, normalizedDefaultRate),
    [collaboratorRateInputs, normalizedDefaultRate],
  );
  const snapshot = useMemo(
    () =>
      buildProjectCostSnapshot({
        collaborators,
        projectValue,
        registeredMaterialCost,
        manualMaterialCost: normalizedManualMaterialCost,
        defaultHourlyRate: normalizedDefaultRate,
        collaboratorRates: normalizedRateMap,
      }),
    [
      collaborators,
      normalizedDefaultRate,
      normalizedManualMaterialCost,
      normalizedRateMap,
      projectValue,
      registeredMaterialCost,
    ],
  );

  const handleCollaboratorRateChange = (employeeId: string, rawValue: string) => {
    setCollaboratorRateInputs((current) => {
      const next = { ...current };
      if (!rawValue.trim()) {
        delete next[employeeId];
        return next;
      }

      const normalizedValue = toPositiveNumber(rawValue, normalizedDefaultRate);
      if (Math.abs(normalizedValue - normalizedDefaultRate) < 0.005) {
        delete next[employeeId];
      } else {
        next[employeeId] = rawValue;
      }

      return next;
    });
  };

  const handleResetRate = (employeeId: string) => {
    setCollaboratorRateInputs((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/projects/consuntivo", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          taskId,
          manualMaterialCost: normalizedManualMaterialCost,
          defaultHourlyRate: normalizedDefaultRate,
          collaboratorRates: normalizedRateMap,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Errore durante il salvataggio");
      }

      const savedDefaultRate = Number(result.data?.defaultHourlyRate || normalizedDefaultRate);
      const savedMaterialCost = Number(
        result.data?.manualMaterialCost || normalizedManualMaterialCost,
      );
      const savedCollaboratorRates = (result.data?.collaboratorRates || {}) as Record<
        string,
        number
      >;

      setDefaultHourlyRateInput(String(savedDefaultRate));
      setManualMaterialCostInput(String(savedMaterialCost));
      setCollaboratorRateInputs(
        Object.entries(savedCollaboratorRates).reduce<Record<string, string>>(
          (accumulator, [employeeId, rate]) => {
            accumulator[employeeId] = String(rate);
            return accumulator;
          },
          {},
        ),
      );

      router.refresh();
      toast({ description: "Consuntivo progetto aggiornato." });
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante il salvataggio del consuntivo.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReport = async () => {
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

      await downloadResponseFile(response, `report-consuntivo-${taskId}.pdf`);
    } catch (error) {
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Errore durante il download del PDF.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const timeCardClass =
    "rounded-2xl border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-700 dark:bg-slate-800/50";
  const innerCardClass =
    "rounded-lg border border-white/80 bg-white/90 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70";

  return (
    <>
      <div className={timeCardClass}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ore registrate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Base {formatSwissCurrency(snapshot.defaultHourlyRate)} / h
            </Badge>
            <Button asChild size="sm" variant="outline">
              <Link href={`/sites/${domain}/timetracking/create?taskId=${taskId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Registra ore
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ore registrate</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatHours(snapshot.totalTrackedHours)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Totale cumulativo di {timeEntriesCount} rapporti su {collaborators.length || 0} collaboratori
            </p>
            {latestTimeEntryLabel && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Ultimo inserimento: {latestTimeEntryLabel}
              </p>
            )}
          </div>

          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Valore del tempo</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatSwissCurrency(snapshot.totalLaborCost)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Somma automatica di ore x tariffa per ogni collaboratore.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {snapshot.collaborators.length > 0 ? (
            <div className="space-y-2.5">
              {snapshot.collaborators.map((collaborator) => (
                <div
                  key={collaborator.employeeId}
                  className="grid gap-2 rounded-lg border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 md:grid-cols-[minmax(0,1fr)_170px_120px_auto] md:items-center"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: collaborator.color || "#6366f1" }}
                    >
                      {buildInitials(collaborator.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {collaborator.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {collaborator.entries} rapporti
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tariffa</p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        collaboratorRateInputs[collaborator.employeeId] ??
                        String(snapshot.defaultHourlyRate)
                      }
                      onChange={(event) =>
                        handleCollaboratorRateChange(
                          collaborator.employeeId,
                          event.target.value,
                        )
                      }
                      className="mt-1 h-9 text-right"
                    />
                  </div>
                  <div className="md:text-right">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Totale ore</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatHours(collaborator.hours)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-start md:justify-self-end"
                    onClick={() => handleResetRate(collaborator.employeeId)}
                    disabled={!collaborator.usesCustomRate}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Usa base
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nessun rapporto ore registrato per questo progetto.
            </p>
          )}
        </div>
      </div>

      <div className={timeCardClass}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Valori commessa
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            disabled={isDownloading}
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Generazione..." : "Scarica PDF"}
          </Button>
        </div>

        <div className="space-y-3">
          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Valore commessa</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {formatSwissCurrency(snapshot.projectValue)}
            </p>
          </div>

          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Costi materiale registrati
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {formatSwissCurrency(snapshot.registeredMaterialCost)}
            </p>
          </div>

          <div className={innerCardClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Materiale extra consuntivo
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Inserimento manuale dei costi materiale da aggiungere al totale.
                </p>
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualMaterialCostInput}
                  onChange={(event) => setManualMaterialCostInput(event.target.value)}
                  className="text-right"
                />
              </div>
            </div>
          </div>

          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Totale materiale</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {formatSwissCurrency(snapshot.totalMaterialCost)}
            </p>
          </div>

          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Totale manodopera</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {formatSwissCurrency(snapshot.totalLaborCost)}
            </p>
          </div>

          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Costo complessivo consuntivo
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {formatSwissCurrency(snapshot.totalProjectCost)}
            </p>
          </div>

          <div className={innerCardClass}>
            <p className="text-xs text-slate-500 dark:text-slate-400">Margine residuo</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                snapshot.margin >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatSwissCurrency(snapshot.margin)}
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Salvataggio..." : "Salva costi consuntivo"}
          </Button>
        </div>
      </div>
    </>
  );
}
