"use client";

import { AlertTriangle, Tag, Hash } from "lucide-react";
import { ProductsDashboardStats } from "@/lib/server-data";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ProdottiAlertsProps {
  data: ProductsDashboardStats["alerts"];
}

function getAlertIcon(type: string) {
  switch (type) {
    case "missing_category":
      return <Tag className="w-4 h-4 text-yellow-500" />;
    case "missing_production_qty":
      return <Hash className="w-4 h-4 text-blue-500" />;
    case "missing_price":
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

function getFilterHref(
  type: string,
  domain: string,
  id: number | string
): string {
  switch (type) {
    case "missing_category":
      return `/sites/${domain}/products?filter=no_category`;
    case "missing_production_qty":
      return `/sites/${domain}/projects?taskId=${id}`;
    case "missing_price":
      return `/sites/${domain}/products?filter=no_price`;
    default:
      return `/sites/${domain}/products`;
  }
}

export default function ProdottiAlerts({ data }: ProdottiAlertsProps) {
  const params = useParams();
  const domain = params.domain as string;

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Dati mancanti prodotti</h3>
          <p className="text-xs text-muted-foreground">
            Problemi di qualità dati da risolvere
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          Nessun problema rilevato
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((alert, index) => {
            const href = getFilterHref(alert.type, domain, alert.id);

            return (
              <Link
                key={`${alert.id}-${index}`}
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
                  {alert.productName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Prodotto: {alert.productName}
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
