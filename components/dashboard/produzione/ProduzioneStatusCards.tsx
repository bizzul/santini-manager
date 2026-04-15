"use client";

import Link from "next/link";
import { Factory } from "lucide-react";
import { ProduzioneDashboardStats } from "@/lib/server-data";
import { getKanbanIcon } from "@/lib/kanban-icons";

interface ProduzioneStatusCardsProps {
  data: ProduzioneDashboardStats["kanbanStatus"];
  domain: string;
}

interface StatusCardProps {
  label: string;
  lavori: number;
  elementi: number;
  color: string;
  icon: string | null;
  href: string;
}

function StatusCard({ label, lavori, elementi, color, icon, href }: StatusCardProps) {
  const Icon = getKanbanIcon(icon);
  
  return (
    <Link href={href}>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 transition-colors hover:bg-slate-700/50 hover:border-slate-600/50 cursor-pointer">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
            {label}
          </span>
        </div>
        <div className="text-3xl font-bold mb-1">{lavori}</div>
        <div className="text-xs text-muted-foreground">
          {elementi} elementi
        </div>
      </div>
    </Link>
  );
}

export default function ProduzioneStatusCards({
  data,
  domain,
}: ProduzioneStatusCardsProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="dashboard-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
          <Factory className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Stato Produzione</h3>
          <p className="text-xs text-muted-foreground">
            Lavori ed elementi per reparto
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.map((kanban) => (
          <StatusCard
            key={kanban.kanbanId}
            label={kanban.kanbanName}
            lavori={kanban.lavori}
            elementi={kanban.elementi}
            color={kanban.color}
            icon={kanban.icon}
            href={`/sites/${domain}/kanban?name=${kanban.kanbanIdentifier}`}
          />
        ))}
      </div>
    </div>
  );
}
