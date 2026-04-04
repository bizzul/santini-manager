"use client";

import Link from "next/link";
import type { FactoryDepartmentData } from "@/lib/factory/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatFactoryDate } from "@/components/factory/factory-icons";
import { ArrowUpRight, CircleDot, Clock3, PackageCheck, PlayCircle } from "lucide-react";

interface FactoryProductFlowProps {
  department: FactoryDepartmentData;
  domain: string;
}

const bucketConfig = {
  waiting: {
    label: "In attesa",
    icon: Clock3,
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  inProgress: {
    label: "In lavorazione",
    icon: PlayCircle,
    className:
      "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  delivered: {
    label: "Consegnati",
    icon: PackageCheck,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
} as const;

export function FactoryProductFlow({
  department,
  domain,
}: FactoryProductFlowProps) {
  const total =
    department.flow.waiting +
    department.flow.inProgress +
    department.flow.delivered;

  return (
    <Card className="border-white/20 bg-background/80 shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold">Flusso prodotti</h4>
            <p className="text-sm text-muted-foreground">
              Situazione live derivata da task e colonne kanban del reparto.
            </p>
          </div>

          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
            href={`/sites/${domain}/kanban?name=${department.kanbanIdentifier}`}
          >
            Apri kanban reparto
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(bucketConfig) as Array<keyof typeof bucketConfig>).map((key) => {
            const config = bucketConfig[key];
            const Icon = config.icon;
            const value = department.flow[key];
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

            return (
              <div
                key={key}
                className="rounded-2xl border bg-muted/25 p-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge className={config.className}>
                    <Icon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                  <span className="text-sm font-medium">{value}</span>
                </div>
                <div className="mt-4 text-2xl font-semibold">{percentage}%</div>
                <Progress className="mt-3 h-2" value={percentage} />
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium">Pratiche prioritarie</div>
          {department.tasks.length > 0 ? (
            <div className="space-y-2">
              {department.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-2xl border bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-4 w-4 text-primary" />
                      <span className="truncate font-medium">{task.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {task.uniqueCode && <span>{task.uniqueCode}</span>}
                      <span>{task.quantity} pezzi</span>
                      <span>{task.statusLabel}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Consegna {formatFactoryDate(task.dueDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Nessuna pratica attiva trovata per questo reparto.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
