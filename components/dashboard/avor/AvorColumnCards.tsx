"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Layers } from "lucide-react";
import { AvorDashboardStats } from "@/lib/server-data";
import { getKanbanIcon } from "@/lib/kanban-icons";

interface AvorColumnCardsProps {
  columnStatus: AvorDashboardStats["columnStatus"];
  columnWorkload: AvorDashboardStats["columnWorkload"];
  avorKanbanIdentifier: string | null;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
}

type ColumnWorkload = AvorDashboardStats["columnWorkload"][number];

function ColumnWorkloadChart({ categories }: { categories: ColumnWorkload["categories"] }) {
  const globalMax = Math.max(
    ...categories.flatMap((c) => [c.pratiche, c.elementi]),
    1
  );

  if (categories.length === 0) {
    return (
      <div className="rounded-lg bg-foreground/[0.06] border border-foreground/25 p-3 flex-1 flex items-center justify-center min-h-[120px]">
        <span className="text-xs text-muted-foreground">
          Nessun prodotto
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-foreground/[0.06] border border-foreground/25 p-3 flex-1">
      <div className="space-y-2">
        {categories.map((cat) => {
          const Icon = getKanbanIcon(cat.icon);
          const praticaPct = (cat.pratiche / globalMax) * 100;
          const elementiPct = (cat.elementi / globalMax) * 100;
          return (
            <div key={cat.category} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${cat.color}20` }}
                title={cat.category}
              >
                <Icon className="w-3 h-3" style={{ color: cat.color }} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-2.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(praticaPct, 3)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold w-5 text-right tabular-nums">
                    {cat.pratiche}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-2.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full opacity-60"
                      style={{
                        width: `${Math.max(elementiPct, 3)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold w-5 text-right tabular-nums">
                    {cat.elementi}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2 rounded-sm bg-foreground/50" />
            <span className="text-[10px] text-muted-foreground">Pratiche</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2 rounded-sm bg-foreground/50 opacity-60" />
            <span className="text-[10px] text-muted-foreground">Elementi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AvorColumnCards({
  columnStatus,
  columnWorkload,
  avorKanbanIdentifier,
}: AvorColumnCardsProps) {
  const params = useParams();
  const domain = params.domain as string;

  const workloadByColumn = new Map(
    columnWorkload.map((cw) => [cw.columnId, cw])
  );

  const kanbanHref = avorKanbanIdentifier
    ? `/sites/${domain}/kanban?name=${encodeURIComponent(avorKanbanIdentifier)}`
    : null;

  // Card tints by column position (same palette as Overview / Vendita).
  // Inline colors (rgba) so the tints are not purged by Tailwind in production.
  // To Do -> rosso, Rilievo -> arancione, Elaborazione -> giallo, Produzione -> verde
  const CARD_TONES: Array<{ backgroundColor: string; borderColor: string }> = [
    {
      backgroundColor: "rgba(239, 68, 68, 0.35)",
      borderColor: "rgba(248, 113, 113, 0.7)",
    },
    {
      backgroundColor: "rgba(249, 115, 22, 0.35)",
      borderColor: "rgba(251, 146, 60, 0.7)",
    },
    {
      backgroundColor: "rgba(234, 179, 8, 0.35)",
      borderColor: "rgba(250, 204, 21, 0.7)",
    },
    {
      backgroundColor: "rgba(34, 197, 94, 0.35)",
      borderColor: "rgba(74, 222, 128, 0.7)",
    },
  ];

  if (columnStatus.length === 0) {
    return (
      <div className="dashboard-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Stato Pratiche AVOR</h3>
            <p className="text-xs text-muted-foreground">
              Nessuna Kanban AVOR configurata
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Stato Pratiche AVOR</h3>
          <p className="text-xs text-muted-foreground">
            Pratiche per colonna Kanban con prodotti per categoria
          </p>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(
            columnStatus.length,
            5
          )}, minmax(0, 1fr))`,
        }}
      >
        {columnStatus.map((col, index) => {
          const workload = workloadByColumn.get(col.columnId);
          const toneStyle = CARD_TONES[index];
          const card = (
            <div
              className={`rounded-lg border p-3 flex flex-col min-h-[96px] transition ${
                toneStyle ? "" : "bg-foreground/[0.10] border-foreground/40"
              }`}
              style={toneStyle}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-semibold text-foreground">
                  {col.columnName}
                </p>
                <span className="rounded-md border border-foreground/40 px-2 py-0.5 text-base font-semibold leading-none text-foreground">
                  {col.count}
                </span>
              </div>
              <p className="mt-auto pt-2 text-center text-xl font-bold text-foreground">
                {formatCurrency(col.value)}
              </p>
            </div>
          );

          return (
            <div key={col.columnId} className="flex flex-col gap-3">
              {kanbanHref ? <Link href={kanbanHref}>{card}</Link> : card}
              <ColumnWorkloadChart categories={workload?.categories ?? []} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
