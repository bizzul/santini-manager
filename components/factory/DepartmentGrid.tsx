"use client";

import type { FactoryDepartmentData } from "@/lib/factory/types";
import { DepartmentCard } from "@/components/factory/DepartmentCard";

interface DepartmentGridProps {
  departments: FactoryDepartmentData[];
  selectedDepartmentId: string | null;
  onSelectDepartment: (departmentId: string) => void;
}

export function DepartmentGrid({
  departments,
  selectedDepartmentId,
  onSelectDepartment,
}: DepartmentGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">Reparti</h3>
        <p className="text-sm text-muted-foreground">
          Seleziona un reparto per vedere macchinari, coda prodotti e dettagli
          operativi.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => (
          <DepartmentCard
            key={department.id}
            department={department}
            isSelected={selectedDepartmentId === department.id}
            onSelect={() => onSelectDepartment(department.id)}
          />
        ))}
      </div>
    </section>
  );
}
