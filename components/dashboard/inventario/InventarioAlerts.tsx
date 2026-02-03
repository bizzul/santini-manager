"use client";

import { AlertTriangle, DollarSign, Tag, PackageMinus } from "lucide-react";
import { InventoryDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface InventarioAlertsProps {
  data: InventoryDashboardStats["alerts"];
}

function getAlertIcon(type: string) {
  switch (type) {
    case "negative_qty":
      return <PackageMinus className="w-4 h-4 text-red-500" />;
    case "missing_cost":
      return <DollarSign className="w-4 h-4 text-yellow-500" />;
    case "missing_category":
      return <Tag className="w-4 h-4 text-blue-500" />;
    case "low_stock":
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
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

function getFilterParam(type: string): string {
  switch (type) {
    case "negative_qty":
      return "filter=negative_qty";
    case "missing_cost":
      return "filter=missing_cost";
    case "missing_category":
      return "filter=missing_category";
    case "low_stock":
      return "filter=low_stock";
    default:
      return "";
  }
}

export default function InventarioAlerts({ data }: InventarioAlertsProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Anomalie inventario</h3>
          <p className="text-xs text-muted-foreground">
            Articoli che richiedono attenzione
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Nessuna anomalia rilevata
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((alert) => {
            const filterParam = getFilterParam(alert.type);
            const href = `/sites/${domain}/inventory${
              filterParam ? `?${filterParam}` : ""
            }`;

            return (
              <Link
                key={alert.id}
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
                  {alert.categoryName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Categoria: {alert.categoryName}
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
