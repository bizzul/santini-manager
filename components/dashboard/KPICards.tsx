"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Factory,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { DashboardStats } from "@/lib/server-data";

interface KPICardsProps {
  data: DashboardStats;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `CHF ${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `CHF ${(value / 1000).toFixed(0)}k`;
  }
  return `CHF ${value.toFixed(0)}`;
}

function getChangeTone(change: number, invertColor = false) {
  if (change === 0) {
    return {
      textClass: "text-slate-300",
      bgClass: "bg-slate-700/40",
      icon: null,
    };
  }

  const positiveIsGood = !invertColor;
  const isPositive = change > 0;
  const isGood = isPositive ? positiveIsGood : !positiveIsGood;

  return {
    textClass: isGood ? "text-emerald-300" : "text-rose-300",
    bgClass: isGood ? "bg-emerald-500/15" : "bg-rose-500/15",
    icon: isPositive ? ArrowUpRight : ArrowDownRight,
  };
}

function renderChangeBadge(
  change: number,
  options?: { unit?: string; invertColor?: boolean; suffix?: string }
) {
  const { unit = "%", invertColor = false, suffix = "vs mese scorso" } = options || {};
  const tone = getChangeTone(change, invertColor);
  const Icon = tone.icon;
  const valueLabel = `${change > 0 ? "+" : ""}${change.toFixed(0)}${unit}`;

  return (
    <div className="mt-2 flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold ${tone.bgClass} ${tone.textClass}`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {valueLabel}
      </span>
      <span className="text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}

export default function KPICards({ data }: KPICardsProps) {
  const panelClassName =
    "dashboard-panel p-5 relative overflow-hidden";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Offerte Attive */}
      <div className={panelClassName}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Offerte Attive
        </p>
        <h3 className="text-[1.7rem] leading-tight font-bold mb-1">{data.activeOffers.count}</h3>
        <p className="text-xs text-muted-foreground mb-2">
          {formatCurrency(data.activeOffers.totalValue)} totali
        </p>
        {renderChangeBadge(data.activeOffers.changePercent)}
      </div>

      {/* Ordini in Produzione */}
      <div className={panelClassName}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Factory className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Ordini in Produzione
        </p>
        <h3 className="text-[1.7rem] leading-tight font-bold mb-1">
          {data.productionOrders.total}
        </h3>
        <p className="text-xs text-muted-foreground">
          {data.productionOrders.delayed} in ritardo
        </p>
        {renderChangeBadge(data.productionOrders.delayedChange, {
          unit: "",
          invertColor: true,
          suffix: "ritardi vs mese scorso",
        })}
      </div>

      {/* Fatture Aperte */}
      <div className={panelClassName}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Fatture Aperte
        </p>
        <h3 className="text-[1.7rem] leading-tight font-bold mb-1">
          {formatCurrency(data.openInvoices.totalValue)}
        </h3>
        <p className="text-xs text-muted-foreground">
          {data.openInvoices.expiredCount} scadute
        </p>
        {renderChangeBadge(data.openInvoices.changePercent)}
      </div>

      {/* Carico AVOR */}
      <div className={panelClassName}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Carico AVOR
        </p>
        <h3 className="text-[1.7rem] leading-tight font-bold mb-1">
          {data.avorWorkload.percentage.toFixed(0)}%
        </h3>
        <p className="text-xs text-muted-foreground">
          {data.avorWorkload.status}
        </p>
        <span className="mt-2 inline-flex rounded-full bg-orange-500/15 px-2 py-1 text-sm font-semibold text-orange-200">
          Focus carico operativo
        </span>
      </div>
    </div>
  );
}
