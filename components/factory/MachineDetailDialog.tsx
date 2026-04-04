"use client";

import type { FactoryMachineMeta } from "@/lib/factory/types";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatFactoryCurrency,
  formatFactoryDate,
  getFactoryMachineIcon,
  getFactoryMachineStatusClasses,
  getFactoryMachineStatusLabel,
} from "@/components/factory/factory-icons";
import { CalendarClock, Gauge, TimerReset, Users, Wrench } from "lucide-react";

interface MachineDetailDialogProps {
  machine: FactoryMachineMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MachineDetailDialog({
  machine,
  open,
  onOpenChange,
}: MachineDetailDialogProps) {
  const MachineIcon = getFactoryMachineIcon(machine.icon);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <ScrollArea className="max-h-[85vh]">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-72 bg-slate-950">
              <img
                alt={machine.name}
                className="h-full w-full object-cover"
                src={machine.imageUrl}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-4">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white backdrop-blur">
                  <MachineIcon className="h-6 w-6" />
                </div>
                <Badge className={getFactoryMachineStatusClasses(machine.status)}>
                  {getFactoryMachineStatusLabel(machine.status)}
                </Badge>
              </div>
              <div className="absolute inset-x-6 bottom-6 text-white">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-300">
                  {machine.code}
                </div>
                <div className="mt-2 text-2xl font-semibold">{machine.name}</div>
                <p className="mt-2 max-w-xl text-sm text-slate-200">
                  {machine.description}
                </p>
              </div>
            </div>

            <div className="p-6">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl">Scheda macchinario</DialogTitle>
                <DialogDescription>
                  Valori tecnici e indicatori gestionali pronti per il futuro
                  collegamento a dati reali.
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline">Layer tipizzato mock</Badge>
                  <Badge variant="outline">
                    {machine.source.matchedBy === "matcher"
                      ? "Template reparto"
                      : "Template fallback"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="mt-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gauge className="h-4 w-4" />
                      Utilizzo
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {machine.utilization}%
                    </div>
                    <Progress className="mt-3 h-2" value={machine.utilization} />
                  </div>

                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Operatori
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {machine.activeOperators}/{machine.operatorSlots}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Assegnazione stimata in base al carico reparto.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TimerReset className="h-4 w-4" />
                      Ore lavorate
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {machine.workedHours.toLocaleString("it-IT")} h
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Efficienza stimata {machine.efficiency}%.
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      Manutenzione
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {machine.maintenance.hoursUntilService} h
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Prossimo intervento {formatFactoryDate(machine.maintenance.nextServiceDate)}.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Dati tecnici</div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Potenza</dt>
                        <dd className="font-medium">{machine.technical.powerKw} kW</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Output orario</dt>
                        <dd className="font-medium">
                          {machine.technical.throughputPerHour} pz/h
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Ingombro</dt>
                        <dd className="font-medium">{machine.technical.footprint}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Precisione</dt>
                        <dd className="font-medium">{machine.technical.precision}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium">Dati gestionali</div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Data acquisto</dt>
                        <dd className="font-medium">
                          {formatFactoryDate(machine.acquisitionDate)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Valore residuo</dt>
                        <dd className="font-medium">
                          {formatFactoryCurrency(machine.bookValueEur)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Ammortamento</dt>
                        <dd className="font-medium">
                          {machine.depreciationProgress}%
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Ultimo intervento</dt>
                        <dd className="font-medium">
                          {formatFactoryDate(machine.maintenance.lastServiceDate)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="rounded-2xl border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wrench className="h-4 w-4" />
                    Tag e note operative
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {machine.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
