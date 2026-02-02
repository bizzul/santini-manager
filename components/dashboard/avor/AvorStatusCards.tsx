"use client";

import { Layers } from "lucide-react";
import { AvorDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AvorStatusCardsProps {
  data: AvorDashboardStats["columnStatus"];
  avorKanbanId: number | null;
}

interface StatusCardProps {
  label: string;
  count: number;
  delayed: number;
  columnId: number;
  avorKanbanId: number | null;
  domain: string;
}

function StatusCard({
  label,
  count,
  delayed,
  columnId,
  avorKanbanId,
  domain,
}: StatusCardProps) {
  const href = avorKanbanId
    ? `/sites/${domain}/kanban?kanbanId=${avorKanbanId}&columnId=${columnId}`
    : "#";

  return (
    <Link
      href={href}
      className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/50 transition-colors cursor-pointer"
    >
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="text-3xl font-bold mb-1">{count}</div>
      {delayed > 0 && (
        <div className="text-xs text-red-400">{delayed} in ritardo</div>
      )}
      {delayed === 0 && (
        <div className="text-xs text-muted-foreground">Nessun ritardo</div>
      )}
    </Link>
  );
}

export default function AvorStatusCards({
  data,
  avorKanbanId,
}: AvorStatusCardsProps) {
  const params = useParams();
  const domain = params.domain as string;

  if (data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
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
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Stato Pratiche AVOR</h3>
          <p className="text-xs text-muted-foreground">
            Pratiche per colonna Kanban
          </p>
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(
            data.length,
            5
          )}, minmax(0, 1fr))`,
        }}
      >
        {data.map((col) => (
          <StatusCard
            key={col.columnId}
            label={col.columnName}
            count={col.count}
            delayed={col.delayed}
            columnId={col.columnId}
            avorKanbanId={avorKanbanId}
            domain={domain}
          />
        ))}
      </div>
    </div>
  );
}
