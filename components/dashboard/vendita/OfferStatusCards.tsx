"use client";

import { Layers } from "lucide-react";
import { VenditaDashboardStats } from "@/lib/server-data";

interface OfferStatusCardsProps {
  data: VenditaDashboardStats["offerStatus"];
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
  dotColor: string;
}

function StatusCard({ label, count, value, dotColor }: StatusCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
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
}

export default function OfferStatusCards({ data }: OfferStatusCardsProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Stato Offerte</h3>
          <p className="text-xs text-muted-foreground">
            Panoramica delle offerte per stato nel periodo selezionato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatusCard
          label="To Do"
          count={data.todo.count}
          value={data.todo.value}
          dotColor="bg-blue-500"
        />
        <StatusCard
          label="Inviate"
          count={data.inviate.count}
          value={data.inviate.value}
          dotColor="bg-yellow-500"
        />
        <StatusCard
          label="In Trattativa"
          count={data.inTrattativa.count}
          value={data.inTrattativa.value}
          dotColor="bg-orange-500"
        />
        <StatusCard
          label="Vinte"
          count={data.vinte.count}
          value={data.vinte.value}
          dotColor="bg-green-500"
        />
        <StatusCard
          label="Perse"
          count={data.perse.count}
          value={data.perse.value}
          dotColor="bg-red-500"
        />
      </div>
    </div>
  );
}
