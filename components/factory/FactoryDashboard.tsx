"use client";

import { useEffect, useMemo, useState } from "react";
import type { FactoryDashboardData } from "@/lib/factory/types";
import { FactoryOverview } from "@/components/factory/FactoryOverview";
import { DepartmentGrid } from "@/components/factory/DepartmentGrid";
import { DepartmentDetail } from "@/components/factory/DepartmentDetail";
import { FactoryRealtimeSync } from "@/components/factory/FactoryRealtimeSync";
import { Card, CardContent } from "@/components/ui/card";
import { Factory } from "lucide-react";

interface FactoryDashboardProps {
  data: FactoryDashboardData;
  domain: string;
  siteId: string;
}

export function FactoryDashboard({
  data,
  domain,
  siteId,
}: FactoryDashboardProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(
    data.departments[0]?.id ?? null
  );

  useEffect(() => {
    if (
      selectedDepartmentId &&
      data.departments.some((department) => department.id === selectedDepartmentId)
    ) {
      return;
    }

    setSelectedDepartmentId(data.departments[0]?.id ?? null);
  }, [data.departments, selectedDepartmentId]);

  const selectedDepartment = useMemo(
    () =>
      data.departments.find((department) => department.id === selectedDepartmentId) ??
      data.departments[0] ??
      null,
    [data.departments, selectedDepartmentId]
  );

  if (data.departments.length === 0) {
    return (
      <div className="space-y-6">
        <FactoryOverview
          overview={data.overview}
          productionCategoryName={data.productionCategoryName}
          updatedAt={data.updatedAt}
        />

        <Card className="border-dashed border-white/20 bg-background/70">
          <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-primary">
              <Factory className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Nessun reparto disponibile</h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                La sezione `Fabbrica` si alimenta dai kanban produzione esistenti. Appena
                saranno presenti kanban o categorie riconosciute come produzione, i
                reparti appariranno automaticamente qui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FactoryRealtimeSync
        kanbanIds={data.departments.map((department) => department.kanbanId)}
        siteId={siteId}
      />

      <FactoryOverview
        overview={data.overview}
        productionCategoryName={data.productionCategoryName}
        updatedAt={data.updatedAt}
      />

      <DepartmentGrid
        departments={data.departments}
        onSelectDepartment={setSelectedDepartmentId}
        selectedDepartmentId={selectedDepartment?.id ?? null}
      />

      {selectedDepartment && (
        <DepartmentDetail department={selectedDepartment} domain={domain} />
      )}
    </div>
  );
}
