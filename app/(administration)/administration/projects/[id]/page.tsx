import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ExternalLink,
  Globe,
  Pencil,
  QrCode,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUserContext } from "@/lib/auth-utils";
import { isManagerOfManagersEnabled } from "@/lib/manager-projects/flag";
import {
  fetchManagerProject,
  fetchProjectHoursDetail,
  fetchProjectStageEvents,
} from "@/lib/manager-projects/queries";
import { PROJECT_STAGE_LABELS } from "@/lib/manager-projects/types";
import { formatMinutesAsHours } from "@/components/calendar/calendar-utils";
import { ProjectCard } from "@/components/admin/ProjectCard";
import { ProjectHoursForm } from "@/components/admin/ProjectHoursForm";
import { ProjectNotesForm } from "@/components/admin/ProjectNotesForm";

export const dynamic = "force-dynamic";

function formatMonth(month: string): string {
  return new Date(month).toLocaleDateString("it-CH", {
    month: "long",
    year: "numeric",
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userContext = await getUserContext();
  if (!userContext || userContext.role !== "superadmin") {
    redirect("/administration");
  }
  if (!isManagerOfManagersEnabled()) {
    redirect("/administration");
  }

  const { id } = await params;
  const project = await fetchManagerProject(id);
  if (!project) {
    notFound();
  }

  const [hoursDetail, stageEvents] = await Promise.all([
    fetchProjectHoursDetail(id),
    fetchProjectStageEvents(id),
  ]);

  const totalMinutes = hoursDetail.reduce((sum, r) => sum + r.total_minutes, 0);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  const spaceUrl =
    project.site.subdomain && rootDomain
      ? `https://${project.site.subdomain}.${rootDomain}`
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/administration/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Progetti
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {spaceUrl && (
            <a href={spaceUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Apri spazio
              </Button>
            </a>
          )}
        </div>
      </div>

      <ProjectCard project={project} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Ore per collaboratore ({formatMinutesAsHours(totalMinutes)}{" "}
                totali)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hoursDetail.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nessuna ora registrata su questo spazio.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collaboratore</TableHead>
                      <TableHead>Mese</TableHead>
                      <TableHead className="text-right">Ore</TableHead>
                      <TableHead className="text-right">Voci</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hoursDetail.map((row, i) => (
                      <TableRow key={`${row.employee_id}-${row.month}-${i}`}>
                        <TableCell className="font-medium">
                          {row.employee_label}
                        </TableCell>
                        <TableCell className="capitalize">
                          {formatMonth(row.month)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatMinutesAsHours(row.total_minutes)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.entries_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Storico stage</CardTitle>
            </CardHeader>
            <CardContent>
              {stageEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nessun evento registrato.
                </p>
              ) : (
                <ul className="space-y-2">
                  {stageEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-1.5">
                        {event.from_stage ? (
                          <>
                            <span className="text-muted-foreground">
                              {PROJECT_STAGE_LABELS[event.from_stage]}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {PROJECT_STAGE_LABELS[event.to_stage]}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            Creato in {PROJECT_STAGE_LABELS[event.to_stage]}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {event.changed_by_label ? `${event.changed_by_label} · ` : ""}
                        {new Date(event.created_at).toLocaleDateString("it-CH")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestione spazio</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link href={`/administration/sites/${project.site_id}`}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Globe className="mr-2 h-4 w-4" />
                  Dettaglio sito
                </Button>
              </Link>
              <Link href={`/administration/sites/${project.site_id}/edit`}>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifica sito
                </Button>
              </Link>
              <Link href="/administration/users">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Utenti
                </Button>
              </Link>
              <Link href="/administration/demos">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <QrCode className="mr-2 h-4 w-4" />
                  Demo QR
                </Button>
              </Link>
            </CardContent>
          </Card>

          <ProjectNotesForm
            projectId={project.id}
            initialNotes={project.notes}
          />

          <ProjectHoursForm projectId={project.id} />
        </div>
      </div>
    </div>
  );
}
