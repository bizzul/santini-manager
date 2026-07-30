"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  TM_SALUTE_COLORS,
  TM_SALUTE_LABELS,
  TM_SENSOR_LABELS,
  type TmStatoSalute,
} from "@/lib/treemap/constants";
import type { TreemapSensoreStatoRow, TreemapLetturaRow } from "@/lib/treemap-data";
import SensorReadingChart from "@/components/treemap/SensorReadingChart";
import { ChevronDown, ChevronUp } from "lucide-react";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h fa`;
  const days = Math.floor(hours / 24);
  return `${days} giorni fa`;
}

function formatAbsoluteTime(iso: string): string {
  return new Intl.DateTimeFormat("it-CH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function ThresholdBar({
  value,
  verdeMin,
  verdeMax,
  gialloMin,
  gialloMax,
}: {
  value: number;
  verdeMin: number | null;
  verdeMax: number | null;
  gialloMin: number | null;
  gialloMax: number | null;
}) {
  const bounds = [
    gialloMin,
    verdeMin,
    verdeMax,
    gialloMax,
    value,
  ].filter((v): v is number => v != null);
  if (bounds.length < 2) return null;

  const min = Math.min(...bounds) * 0.95;
  const max = Math.max(...bounds) * 1.05;
  const span = max - min || 1;
  const pct = ((value - min) / span) * 100;

  const zone = (from: number | null, to: number | null, color: string) => {
    if (from == null || to == null) return null;
    const left = ((from - min) / span) * 100;
    const width = ((to - from) / span) * 100;
    return (
      <div
        className="absolute top-0 h-full opacity-40"
        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
      />
    );
  };

  return (
    <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {zone(gialloMin, verdeMin, TM_SALUTE_COLORS.GIALLO)}
      {zone(verdeMin, verdeMax, TM_SALUTE_COLORS.VERDE)}
      {zone(verdeMax, gialloMax, TM_SALUTE_COLORS.GIALLO)}
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
        style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

interface TreemapSensoreCardProps {
  sensore: TreemapSensoreStatoRow;
  domain: string;
  expanded: boolean;
  onToggle: () => void;
}

export default function TreemapSensoreCard({
  sensore,
  domain,
  expanded,
  onToggle,
}: TreemapSensoreCardProps) {
  const [readings, setReadings] = React.useState<TreemapLetturaRow[]>([]);
  const [readingsLoading, setReadingsLoading] = React.useState(false);
  const [readingsError, setReadingsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!expanded) {
      setReadings([]);
      setReadingsError(null);
      return;
    }

    let cancelled = false;
    setReadingsLoading(true);
    setReadingsError(null);

    void fetch(
      `/api/sites/${domain}/treemap/sensori/${sensore.sensore_id}/letture`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Fetch fallito");
        return res.json() as Promise<{ readings?: TreemapLetturaRow[] }>;
      })
      .then((payload) => {
        if (!cancelled) setReadings(payload.readings ?? []);
      })
      .catch(() => {
        if (!cancelled) setReadingsError("Impossibile caricare lo storico");
      })
      .finally(() => {
        if (!cancelled) setReadingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [expanded, sensore.sensore_id, domain]);

  const delta = sensore.delta_24h;
  const deltaLabel =
    delta != null
      ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} ${sensore.unita_misura}`
      : null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{TM_SENSOR_LABELS[sensore.tipo]}</p>
            <span
              className="rounded-full border px-2 py-0.5 text-xs font-medium"
              style={{
                borderColor: TM_SALUTE_COLORS[sensore.stato],
                color: TM_SALUTE_COLORS[sensore.stato],
              }}
            >
              {TM_SALUTE_LABELS[sensore.stato]}
            </span>
          </div>
          {sensore.etichetta ? (
            <p className="text-xs text-muted-foreground">{sensore.etichetta}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? "Chiudi grafico" : "Apri grafico 30 giorni"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {sensore.valore_attuale != null ? (
        <div className="mt-3">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {sensore.valore_attuale.toFixed(2)}
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              {sensore.unita_misura}
            </span>
          </p>
          {deltaLabel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {delta != null && delta > 0 ? "↑" : delta != null && delta < 0 ? "↓" : "→"}{" "}
              {deltaLabel} nelle ultime 24 h
            </p>
          ) : null}
          {sensore.misurato_at ? (
            <p
              className="mt-1 text-xs text-muted-foreground"
              title={formatAbsoluteTime(sensore.misurato_at)}
            >
              {formatRelativeTime(sensore.misurato_at)}
            </p>
          ) : null}
          <ThresholdBar
            value={sensore.valore_attuale}
            verdeMin={sensore.verde_min}
            verdeMax={sensore.verde_max}
            gialloMin={sensore.giallo_min}
            gialloMax={sensore.giallo_max}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nessuna lettura ricevuta
          {sensore.installato_at
            ? ` · installato il ${formatAbsoluteTime(sensore.installato_at)}`
            : ""}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {[sensore.modello, sensore.batteria_pct != null ? `Batteria ${sensore.batteria_pct.toFixed(0)}%` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {expanded ? (
        <div className="mt-3 border-t pt-3">
          {readingsError ? (
            <p className="text-sm text-destructive">{readingsError}</p>
          ) : (
            <SensorReadingChart
              label={`${TM_SENSOR_LABELS[sensore.tipo]} — 30 giorni`}
              unit={sensore.unita_misura}
              readings={readings}
              loading={readingsLoading}
              color={TM_SALUTE_COLORS[sensore.stato]}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function sortSensoriByStato(
  sensori: TreemapSensoreStatoRow[],
): TreemapSensoreStatoRow[] {
  const priority: Record<TmStatoSalute, number> = {
    ROSSO: 0,
    OFFLINE: 1,
    GIALLO: 2,
    SCONOSCIUTO: 3,
    VERDE: 4,
  };
  return [...sensori].sort(
    (a, b) => priority[a.stato] - priority[b.stato] || a.tipo.localeCompare(b.tipo),
  );
}
