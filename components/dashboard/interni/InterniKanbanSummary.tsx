"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { InterniDashboardStats } from "@/lib/server-data";
import { getKanbanIcon } from "@/lib/kanban-icons";

interface InterniKanbanSummaryProps {
  data: InterniDashboardStats["kanbanSummary"];
  domain: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
}

interface StatusCardProps {
  label: string;
  projects: number;
  elementi: number;
  value: number;
  color: string;
  icon: string | null;
  href: string;
}

function StatusCard({
  label,
  projects,
  elementi,
  value,
  color,
  icon,
  href,
}: StatusCardProps) {
  const Icon = getKanbanIcon(icon);

  return (
    <Link
      href={href}
      className="rounded-lg bg-foreground/[0.10] border border-foreground/40 p-3 flex flex-col min-h-[116px] transition hover:border-primary/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-sm font-semibold text-foreground truncate">
            {label}
          </span>
        </div>
        <span className="rounded-md border border-foreground/40 px-2 py-0.5 text-base font-semibold leading-none text-foreground shrink-0">
          {projects}
        </span>
      </div>

      <div className="mt-2 flex justify-center">
        <span className="rounded-md border border-foreground/40 px-2 py-0.5 text-sm font-semibold text-foreground">
          {elementi} elementi
        </span>
      </div>

      <p className="mt-auto pt-2 text-center text-xl font-bold text-foreground">
        {formatCurrency(value)}
      </p>
    </Link>
  );
}

export default function InterniKanbanSummary({
  data,
  domain,
}: InterniKanbanSummaryProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Riepilogo Kanban Interni</h3>
          <p className="text-xs text-muted-foreground">
            Progetti, elementi e valore per bacheca
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
        {data.map((kanban) => (
          <StatusCard
            key={kanban.kanbanId}
            label={kanban.kanbanName}
            projects={kanban.projects}
            elementi={kanban.elementi}
            value={kanban.value}
            color={kanban.color}
            icon={kanban.icon}
            href={`/sites/${domain}/kanban?name=${encodeURIComponent(
              kanban.kanbanIdentifier
            )}`}
          />
        ))}
      </div>
    </div>
  );
}
