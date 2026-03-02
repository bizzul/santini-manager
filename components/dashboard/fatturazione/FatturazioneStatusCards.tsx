"use client";

import Link from "next/link";
import {
  Receipt,
  FileText,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { FatturazioneDashboardStats } from "@/lib/server-data";

interface FatturazioneStatusCardsProps {
  data: FatturazioneDashboardStats["invoiceStatus"];
  kanbanIdentifier: string | null;
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
  count: number;
  value: number;
  color: string;
  icon: LucideIcon;
  href: string | null;
}

function StatusCard({ label, count, value, color, icon: Icon, href }: StatusCardProps) {
  const content = (
    <div
      className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 transition-colors ${
        href ? "hover:bg-slate-700/50 hover:border-slate-600/50 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold mb-1">{count}</div>
      <div className="text-xs text-muted-foreground">
        {formatCurrency(value)}
      </div>
    </div>
  );

  if (!href) return content;

  return <Link href={href}>{content}</Link>;
}

export default function FatturazioneStatusCards({
  data,
  kanbanIdentifier,
  domain,
}: FatturazioneStatusCardsProps) {
  const kanbanHref = kanbanIdentifier
    ? `/sites/${domain}/kanban?name=${kanbanIdentifier}`
    : null;

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Stato Fatture</h3>
          <p className="text-xs text-muted-foreground">
            Panoramica delle fatture per stato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatusCard
          label="Da Emettere"
          count={data.daEmettere.count}
          value={data.daEmettere.value}
          color="#3b82f6"
          icon={FileText}
          href={kanbanHref}
        />
        <StatusCard
          label="Emesse"
          count={data.emesse.count}
          value={data.emesse.value}
          color="#eab308"
          icon={Send}
          href={kanbanHref}
        />
        <StatusCard
          label="In Scadenza"
          count={data.inScadenza.count}
          value={data.inScadenza.value}
          color="#f97316"
          icon={Clock}
          href={kanbanHref}
        />
        <StatusCard
          label="Pagate"
          count={data.pagate.count}
          value={data.pagate.value}
          color="#22c55e"
          icon={CheckCircle}
          href={kanbanHref}
        />
        <StatusCard
          label="Scadute"
          count={data.scadute.count}
          value={data.scadute.value}
          color="#ef4444"
          icon={AlertTriangle}
          href={kanbanHref}
        />
      </div>
    </div>
  );
}
