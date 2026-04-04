"use client";

import type { FactoryDashboardData } from "@/lib/factory/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock3, Factory, Package, Truck, Users } from "lucide-react";

interface FactoryOverviewProps {
  overview: FactoryDashboardData["overview"];
  updatedAt: string;
  productionCategoryName: string | null;
}

const metricCards = [
  {
    key: "departments",
    label: "Reparti attivi",
    icon: Factory,
    getValue: (overview: FactoryDashboardData["overview"]) => overview.departmentsCount,
    helper: (overview: FactoryDashboardData["overview"]) =>
      `${overview.machinesCount} macchinari visualizzati`,
  },
  {
    key: "operators",
    label: "Operatori stimati",
    icon: Users,
    getValue: (overview: FactoryDashboardData["overview"]) => overview.activeOperators,
    helper: () => "Assegnazione derivata dal carico corrente",
  },
  {
    key: "jobs",
    label: "Lavori in reparto",
    icon: Activity,
    getValue: (overview: FactoryDashboardData["overview"]) => overview.totalJobs,
    helper: (overview: FactoryDashboardData["overview"]) =>
      `${overview.delayedJobs} con priorita critica`,
  },
  {
    key: "items",
    label: "Pezzi tracciati",
    icon: Package,
    getValue: (overview: FactoryDashboardData["overview"]) => overview.totalItems,
    helper: (overview: FactoryDashboardData["overview"]) =>
      `${overview.inProgress} in lavorazione`,
  },
];

export function FactoryOverview({
  overview,
  updatedAt,
  productionCategoryName,
}: FactoryOverviewProps) {
  const updatedLabel = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(updatedAt));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-white/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                Sezione Fabbrica
              </Badge>
              {productionCategoryName ? (
                <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/10">
                  Categoria {productionCategoryName}
                </Badge>
              ) : (
                <Badge className="border-amber-400/20 bg-amber-400/10 text-amber-100 hover:bg-amber-400/10">
                  Rilevamento automatico produzione
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Visione operativa di reparti, macchinari e code prodotto
              </h2>
              <p className="max-w-3xl text-sm text-slate-300 md:text-base">
                La panoramica riusa i dati attuali di produzione e li combina con un
                layer tipizzato per mostrare reparti, macchinari e stato lavori in un
                unico spazio manageriale.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <Clock3 className="h-5 w-5 text-cyan-300" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Ultimo aggiornamento
                </div>
                <div className="text-sm font-medium text-white">{updatedLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <Truck className="h-5 w-5 text-emerald-300" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Consegnati
                </div>
                <div className="text-sm font-medium text-white">
                  {overview.delivered} pratiche
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <Activity className="h-5 w-5 text-orange-300" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Carico vivo
                </div>
                <div className="text-sm font-medium text-white">
                  {overview.waiting + overview.inProgress} in coda o in corso
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key} className="border-white/20 bg-background/80 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </span>
                  <div className="rounded-xl border border-primary/15 bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-3xl font-semibold tracking-tight">
                  {metric.getValue(overview)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metric.helper(overview)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
