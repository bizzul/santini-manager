"use client";

import type { FactoryDepartmentData } from "@/lib/factory/types";
import { FactoryProductFlow } from "@/components/factory/FactoryProductFlow";
import { MachineCard } from "@/components/factory/MachineCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  getFactoryMachineIcon,
  getFactoryMachineStatusClasses,
} from "@/components/factory/factory-icons";
import { Activity, AlertTriangle, Gauge, Users } from "lucide-react";

interface DepartmentDetailProps {
  department: FactoryDepartmentData;
  domain: string;
}

export function DepartmentDetail({
  department,
  domain,
}: DepartmentDetailProps) {
  const DepartmentIcon = getFactoryMachineIcon(department.departmentIcon);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold tracking-tight">Dettaglio reparto</h3>
        <p className="text-sm text-muted-foreground">
          Focus operativo su macchinari, code prodotto e indicatori gestionali del
          reparto selezionato.
        </p>
      </div>

      <Card className="overflow-hidden border-white/20 bg-background/85 shadow-sm">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-2xl p-3 text-white"
                      style={{ backgroundColor: `${department.color}cc` }}
                    >
                      <DepartmentIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {department.kanbanIdentifier}
                      </div>
                      <h4 className="text-2xl font-semibold tracking-tight">
                        {department.kanbanName}
                      </h4>
                    </div>
                  </div>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    {department.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    {department.flow.waiting} in attesa
                  </Badge>
                  <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                    {department.flow.inProgress} in lavorazione
                  </Badge>
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    {department.flow.delivered} consegnati
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Lavori
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{department.jobs}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    Carico
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {department.loadPercentage}%
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Operatori
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {department.activeOperators}
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Ritardi
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{department.delayed}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saturazione stimata</span>
                  <span className="font-medium">{department.loadPercentage}%</span>
                </div>
                <Progress className="h-2" value={department.loadPercentage} />
              </div>

              <div className="flex flex-wrap gap-2">
                {department.focusAreas.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t bg-muted/10 p-6 lg:border-l lg:border-t-0">
              <div className="space-y-3">
                <div className="text-sm font-medium">Stato macchinari</div>
                <div className="grid gap-3">
                  {department.machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="rounded-2xl border bg-background/80 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{machine.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {machine.code} · {machine.workedHours.toLocaleString("it-IT")} h
                          </div>
                        </div>
                        <Badge className={getFactoryMachineStatusClasses(machine.status)}>
                          {machine.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs className="space-y-4" defaultValue="machines">
        <TabsList className="w-full justify-start overflow-auto">
          <TabsTrigger value="machines">Macchinari</TabsTrigger>
          <TabsTrigger value="flow">Flusso prodotti</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-0" value="machines">
          <div className="grid gap-4 md:grid-cols-2">
            {department.machines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} />
            ))}
          </div>
        </TabsContent>

        <TabsContent className="mt-0" value="flow">
          <FactoryProductFlow department={department} domain={domain} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
