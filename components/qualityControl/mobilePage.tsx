"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { QualityControl } from "@/types/supabase";

import { MobileWorkflowLayout } from "@/components/layout/mobile-workflow-layout";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  quality,
  onClick,
}: {
  quality: any;
  onClick: any;
}) => {
  const statusColor =
    quality.passed === "NOT_DONE"
      ? "text-destructive"
      : quality.passed === "PARTIALLY_DONE"
        ? "text-amber-500"
        : quality.passed === "DONE"
          ? "text-emerald-500"
          : "text-muted-foreground";

  return (
    <Card
      onClick={() => onClick(quality)}
      role="button"
      tabIndex={0}
      className="h-32 w-64 cursor-pointer select-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader>
        <CardTitle>
          {quality.task?.unique_code} -{" "}
          <span className="text-sm">POS.{quality.position_nr}</span>
        </CardTitle>
        <CardDescription>
          <span className="text-sm font-light">
            {quality.task?.sellProduct?.name}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={statusColor}>
          {statusText(quality.passed || "PENDING")}
        </div>
      </CardContent>
    </Card>
  );
};

function MobilePage({
  data,
}: {
  data: {
    quality: QualityControl[];
  };
  session?: any;
}) {
  const router = useRouter();

  const handleQualityClick = (quality: any) => {
    router.push(`/qualityControl/edit/${quality.id}`);
  };

  return (
    <MobileWorkflowLayout
      title="Quality control"
      subtitle="Seleziona un controllo qualita da completare"
    >
      {data.quality.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Nessun controllo qualita da effettuare"
          description="Quando saranno disponibili nuovi controlli compariranno qui."
        />
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {data.quality.map((quality) => (
            <TaskCard
              key={quality.id}
              quality={quality}
              onClick={handleQualityClick}
            />
          ))}
        </div>
      )}
    </MobileWorkflowLayout>
  );
}

export default MobilePage;
