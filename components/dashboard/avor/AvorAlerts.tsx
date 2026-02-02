"use client";

import { AlertTriangle, Clock, HelpCircle } from "lucide-react";
import { AvorDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface AvorAlertsProps {
  data: AvorDashboardStats["alerts"];
  avorKanbanId: number | null;
}

function getAlertIcon(type: string) {
  switch (type) {
    case "delayed":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "stale":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "missing_data":
      return <HelpCircle className="w-4 h-4 text-blue-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-slate-500" />;
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "bg-red-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-blue-500";
    default:
      return "bg-slate-500";
  }
}

export default function AvorAlerts({ data, avorKanbanId }: AvorAlertsProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Alert & Criticità</h3>
          <p className="text-xs text-muted-foreground">
            Pratiche che richiedono attenzione
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Nessuna criticità rilevata
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((alert) => {
            const href = avorKanbanId
              ? `/sites/${domain}/kanban?kanbanId=${avorKanbanId}&taskId=${alert.id}`
              : "#";

            return (
              <Link
                key={`${alert.id}-${alert.type}`}
                href={href}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full ${getPriorityColor(
                    alert.priority
                  )} shrink-0 mt-1.5`}
                />
                <div className="shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{alert.message}</p>
                  {alert.taskCode && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Codice: {alert.taskCode}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
