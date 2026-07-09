import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth-utils";
import { isManagerOfManagersEnabled } from "@/lib/manager-projects/flag";
import { fetchManagerProjects } from "@/lib/manager-projects/queries";
import {
  HIDDEN_PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
} from "@/lib/manager-projects/types";
import { ProjectsBoard } from "@/components/admin/ProjectsBoard";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    redirect("/administration");
  }
  if (!isManagerOfManagersEnabled()) {
    redirect("/administration");
  }

  const projects = await fetchManagerProjects();
  const hidden = projects.filter((p) =>
    HIDDEN_PROJECT_STAGES.includes(p.stage)
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Progetti</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutti gli spazi organizzati per stato. Trascina una card per far
          avanzare il progetto nel ciclo di vita: lo spazio online non viene
          toccato in alcun modo.
        </p>
      </div>

      <ProjectsBoard projects={projects} />

      {hidden.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          {hidden.length} spazio/i non in board (
          {hidden
            .map(
              (p) => `${p.site.name} — ${PROJECT_STAGE_LABELS[p.stage]}`
            )
            .join(", ")}
          ).
        </p>
      )}
    </div>
  );
}
