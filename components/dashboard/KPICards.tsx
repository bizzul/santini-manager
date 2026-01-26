"use client";

import { FileText, Factory, Receipt, TrendingUp } from "lucide-react";
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

export default function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Offerte Attive */}
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Offerte Attive
        </p>
        <h3 className="text-2xl font-bold mb-1">{data.activeOffers.count}</h3>
        <p className="text-xs text-muted-foreground mb-2">
          {formatCurrency(data.activeOffers.totalValue)} totali
        </p>
        {data.activeOffers.changePercent !== 0 && (
          <span
            className={`text-xs font-medium ${
              data.activeOffers.changePercent > 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {data.activeOffers.changePercent > 0 ? "+" : ""}
            {data.activeOffers.changePercent.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Ordini in Produzione */}
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Factory className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Ordini in Produzione
        </p>
        <h3 className="text-2xl font-bold mb-1">
          {data.productionOrders.total}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {data.productionOrders.delayed} in ritardo
          {data.productionOrders.delayedChange !== 0 && (
            <span
              className={`ml-1 ${
                data.productionOrders.delayedChange > 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {data.productionOrders.delayedChange > 0 ? "+" : ""}
              {data.productionOrders.delayedChange}
            </span>
          )}
        </p>
      </div>

      {/* Fatture Aperte */}
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Fatture Aperte
        </p>
        <h3 className="text-2xl font-bold mb-1">
          {formatCurrency(data.openInvoices.totalValue)}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {data.openInvoices.expiredCount} scadute
          {data.openInvoices.changePercent !== 0 && (
            <span
              className={`ml-1 ${
                data.openInvoices.changePercent > 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {data.openInvoices.changePercent > 0 ? "+" : ""}
              {data.openInvoices.changePercent.toFixed(0)}%
            </span>
          )}
        </p>
      </div>

      {/* Carico AVOR */}
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Carico AVOR
        </p>
        <h3 className="text-2xl font-bold mb-1">
          {data.avorWorkload.percentage.toFixed(0)}%
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {data.avorWorkload.status}
        </p>
      </div>
    </div>
  );
}
