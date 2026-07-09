"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MomentumKanban } from "@/components/momentum/MomentumKanban";
import { ProjectCard } from "./ProjectCard";
import {
  HIDDEN_PROJECT_STAGES,
  PROJECT_STAGE_COLUMNS,
  type ManagerProjectSummary,
  type ProjectStage,
} from "@/lib/manager-projects/types";
import { updateProjectStage } from "@/app/(administration)/administration/projects/actions";
import { useToast } from "@/components/ui/use-toast";

interface ProjectsBoardProps {
  projects: ManagerProjectSummary[];
}

export function ProjectsBoard({ projects }: ProjectsBoardProps) {
  const [items, setItems] = React.useState(projects);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => setItems(projects), [projects]);

  const boardItems = items
    .filter((p) => !HIDDEN_PROJECT_STAGES.includes(p.stage))
    .map((p) => ({ ...p, columnId: p.stage }));

  async function handleMove(id: string, toColumnId: string) {
    const prev = items;
    const toStage = toColumnId as ProjectStage;
    setItems((cur) =>
      cur.map((p) => (p.id === id ? { ...p, stage: toStage } : p))
    );
    const result = await updateProjectStage(id, toStage);
    if (!result.success) {
      setItems(prev);
      toast({
        title: "Spostamento non riuscito",
        description: result.message || "Riprova più tardi.",
        variant: "destructive",
      });
      return;
    }
    router.refresh();
  }

  return (
    <MomentumKanban
      columns={PROJECT_STAGE_COLUMNS}
      items={boardItems}
      renderCard={(item) => (
        <ProjectCard
          project={item}
          href={`/administration/projects/${item.id}`}
        />
      )}
      onMove={handleMove}
      emptyLabel="Nessun progetto"
    />
  );
}
