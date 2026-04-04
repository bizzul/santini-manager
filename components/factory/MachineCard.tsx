"use client";

import { useState } from "react";
import type { FactoryMachineMeta } from "@/lib/factory/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  getFactoryMachineIcon,
  getFactoryMachineStatusClasses,
  getFactoryMachineStatusLabel,
} from "@/components/factory/factory-icons";
import { MachineDetailDialog } from "@/components/factory/MachineDetailDialog";
import { Gauge, Settings2, Users, Wrench } from "lucide-react";

interface MachineCardProps {
  machine: FactoryMachineMeta;
}

export function MachineCard({ machine }: MachineCardProps) {
  const [open, setOpen] = useState(false);
  const MachineIcon = getFactoryMachineIcon(machine.icon);

  return (
    <>
      <button className="text-left" onClick={() => setOpen(true)} type="button">
        <Card className="group h-full overflow-hidden border-white/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
          <div className="relative h-40 overflow-hidden bg-slate-950">
            <img
              alt={machine.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              src={machine.imageUrl}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-2 text-white backdrop-blur">
                <MachineIcon className="h-5 w-5" />
              </div>
              <Badge className={getFactoryMachineStatusClasses(machine.status)}>
                {getFactoryMachineStatusLabel(machine.status)}
              </Badge>
            </div>
            <div className="absolute inset-x-4 bottom-4 text-white">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-300">
                {machine.code}
              </div>
              <div className="mt-2 text-lg font-semibold">{machine.name}</div>
            </div>
          </div>

          <CardContent className="space-y-4 p-5">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {machine.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  Utilizzo
                </div>
                <div className="mt-2 text-lg font-semibold">{machine.utilization}%</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Operatori
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {machine.activeOperators}/{machine.operatorSlots}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  Efficienza
                </span>
                <span className="font-medium">{machine.efficiency}%</span>
              </div>
              <Progress className="h-2" value={machine.efficiency} />
            </div>

            <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Wrench className="h-4 w-4" />
                Prossima manutenzione
              </span>
              <span className="font-medium">
                {machine.maintenance.hoursUntilService} h
              </span>
            </div>
          </CardContent>
        </Card>
      </button>

      <MachineDetailDialog machine={machine} onOpenChange={setOpen} open={open} />
    </>
  );
}
