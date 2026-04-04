"use client";

import type { FactoryDepartmentData } from "@/lib/factory/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, ArrowRight, Package, Users } from "lucide-react";
import { getFactoryMachineIcon } from "@/components/factory/factory-icons";

interface DepartmentCardProps {
  department: FactoryDepartmentData;
  isSelected: boolean;
  onSelect: () => void;
}

export function DepartmentCard({
  department,
  isSelected,
  onSelect,
}: DepartmentCardProps) {
  const DepartmentIcon = getFactoryMachineIcon(department.departmentIcon);

  return (
    <button className="text-left" onClick={onSelect} type="button">
      <Card
        className={cn(
          "group overflow-hidden border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
          isSelected
            ? "border-primary/40 shadow-lg ring-1 ring-primary/30"
            : "border-white/20 hover:border-primary/25"
        )}
      >
        <div className="relative h-36 overflow-hidden">
          <img
            alt={department.kanbanName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={department.coverImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
            <div
              className="rounded-xl border border-white/15 p-2 text-white shadow-lg"
              style={{ backgroundColor: `${department.color}33` }}
            >
              <DepartmentIcon className="h-5 w-5" />
            </div>
            <Badge className="border-white/10 bg-slate-950/70 text-white hover:bg-slate-950/70">
              {department.machines.length} macchine
            </Badge>
          </div>
          <div className="absolute inset-x-4 bottom-4">
            <h3 className="text-lg font-semibold text-white">{department.kanbanName}</h3>
            <p className="line-clamp-2 text-sm text-slate-200">
              {department.description}
            </p>
          </div>
        </div>

        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                Lavori
              </div>
              <div className="mt-2 text-xl font-semibold">{department.jobs}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                Pezzi
              </div>
              <div className="mt-2 text-xl font-semibold">{department.items}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Operatori
              </div>
              <div className="mt-2 text-xl font-semibold">
                {department.activeOperators}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Carico reparto</span>
              <span className="font-medium">{department.loadPercentage}%</span>
            </div>
            <Progress className="h-2" value={department.loadPercentage} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              {department.flow.waiting} in attesa
            </Badge>
            <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300">
              {department.flow.inProgress} in lavorazione
            </Badge>
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              {department.flow.delivered} consegnati
            </Badge>
            {department.delayed > 0 && (
              <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {department.delayed} in ritardo
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Apri dettaglio reparto</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
