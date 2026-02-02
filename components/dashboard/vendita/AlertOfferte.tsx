"use client";

import { AlertCircle } from "lucide-react";
import { VenditaDashboardStats } from "@/lib/server-data";

interface AlertOfferteProps {
  data: VenditaDashboardStats["alerts"];
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-blue-500";
    case "low":
      return "bg-yellow-500";
    default:
      return "bg-slate-500";
  }
}

export default function AlertOfferte({ data }: AlertOfferteProps) {
  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold">Alert Offerte</h3>
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Nessun alert attivo
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div
                className={`w-2 h-2 rounded-full ${getPriorityColor(
                  alert.priority
                )} shrink-0`}
              />
              <p className="text-sm flex-1 min-w-0">{alert.message}</p>
              <span className="text-xs text-muted-foreground shrink-0">
                {alert.time}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
