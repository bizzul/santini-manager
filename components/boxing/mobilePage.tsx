"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { MobileWorkflowLayout } from "@/components/layout/mobile-workflow-layout";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PackingControl {
  id: number;
  passed: string;
  task?: {
    unique_code?: string;
    sellProduct?: {
      name?: string;
    };
  };
}

export const statusText = (status: string) => {
  switch (status) {
    case "NOT_DONE":
      return "Non completato";
    case "PARTIALLY_DONE":
      return "Parzialmente completato";
    case "DONE":
      return "Completato";
    default:
      return "Stato sconosciuto";
  }
};

const TaskCard = ({
  packing,
  onClick,
}: {
  packing: PackingControl;
  onClick: (packing: PackingControl) => void;
}) => {
  const statusColor =
    packing.passed === "NOT_DONE"
      ? "text-destructive"
      : packing.passed === "PARTIALLY_DONE"
        ? "text-amber-500"
        : packing.passed === "DONE"
          ? "text-emerald-500"
          : "text-muted-foreground";

  return (
    <Card
      onClick={() => onClick(packing)}
      role="button"
      tabIndex={0}
      className="h-32 w-64 cursor-pointer select-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader>
        <CardTitle>{packing.task?.unique_code}</CardTitle>
        <CardDescription>
          <span className="text-sm font-light">
            {packing.task?.sellProduct?.name}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={statusColor}>{statusText(packing.passed)}</div>
      </CardContent>
    </Card>
  );
};

function MobilePage({
  data,
}: {
  session?: any;
  data: {
    packing: PackingControl[];
  };
}) {
  const [loading] = useState(false);
  const router = useRouter();

  const handlePackingClick = (packing: PackingControl) => {
    router.push(`/boxing/edit/${packing.id}`);
  };

  return (
    <MobileWorkflowLayout
      title="Check imballaggio"
      subtitle="Seleziona un packing control da verificare"
    >
      {data.packing.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="h-6 w-6" />}
          title="Nessun packing control da verificare"
          description="Quando saranno disponibili nuove richieste compariranno qui."
        />
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {data.packing.map((packing) => (
            <TaskCard
              key={packing.id}
              packing={packing}
              onClick={handlePackingClick}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
      )}
    </MobileWorkflowLayout>
  );
}

export default MobilePage;
