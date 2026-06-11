import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getUserContext } from "@/lib/auth-utils";
import { requireServerSiteContext } from "@/lib/server-data";
import { checkIsAdmin } from "../actions";
import { getCollaboratorDashboard } from "@/lib/collaborator-dashboard.server";
import {
  DetailSheetLayout,
  DetailSheetSection,
} from "@/components/layout/detail-sheet-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { CollaboratorHoursChart } from "@/components/collaborators/CollaboratorHoursChart";
import { CollaboratorReportButton } from "@/components/collaborators/CollaboratorReportButton";

const ATTENDANCE_LABELS: Record<string, string> = {
  presente: "Presente",
  vacanze: "Vacanze",
  malattia: "Malattia",
  infortunio: "Infortunio",
  smart_working: "Smart working",
  formazione: "Formazione",
  assenza_privata: "Assenza privata",
  ipg: "IPG",
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: "In attesa",
  approved: "Approvata",
  rejected: "Rifiutata",
};

const dateFormatter = new Intl.DateTimeFormat("it-CH", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

function formatHours(value: number): string {
  return `${value.toLocaleString("it-CH", { maximumFractionDigits: 1 })} h`;
}

export default async function CollaboratorDashboardPage({
  params,
}: {
  params: Promise<{ domain: string; userId: string }>;
}) {
  const { domain, userId } = await params;
  const collaboratorId = Number(userId);
  if (!Number.isInteger(collaboratorId) || collaboratorId <= 0) {
    notFound();
  }

  const userContext = await getUserContext();
  if (!userContext?.user) {
    redirect("/login");
  }

  const { siteId } = await requireServerSiteContext(domain);
  const isAdmin = await checkIsAdmin(siteId);

  const data = await getCollaboratorDashboard({
    siteId,
    userId: collaboratorId,
  });
  if (!data) {
    notFound();
  }

  // Non-admins can only open their own dashboard.
  const currentAuthId = userContext.userId || userContext.user.id;
  if (!isAdmin && data.profile.authId !== currentAuthId) {
    redirect(`/sites/${domain}/collaborators`);
  }

  const { profile } = data;
  const currentYear = new Date().getFullYear();

  const kpis = [
    {
      label: `Ore ${currentYear}`,
      value: formatHours(data.yearHours),
      hint: `attese ${formatHours(data.expectedYearHours)}`,
    },
    {
      label: "Saldo ore",
      value: `${data.hoursBalance >= 0 ? "+" : ""}${formatHours(data.hoursBalance)}`,
      hint: `${profile.weeklyHours} h/settimana`,
      tone:
        data.hoursBalance >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Ferie residue",
      value: `${data.vacationRemaining} gg`,
      hint: `usate ${data.vacationUsed} di ${profile.vacationDaysPerYear}`,
      tone: data.vacationRemaining > 0 ? undefined : "text-destructive",
    },
    {
      label: "Progetti / attività",
      value: String(data.projects.length),
      hint: "ultimi 12 mesi",
    },
  ];

  return (
    <DetailSheetLayout
      backHref={`/sites/${domain}/collaborators`}
      backLabel="Torna ai collaboratori"
      title={
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border">
            <AvatarImage
              src={profile.picture || undefined}
              alt={profile.fullName}
              className="object-cover"
            />
            <AvatarFallback
              className="text-lg font-semibold"
              style={
                profile.color
                  ? { backgroundColor: profile.color, color: "#fff" }
                  : undefined
              }
            >
              {profile.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.companyRole || "Collaboratore"}
            </p>
          </div>
        </div>
      }
      meta={
        <>
          <Badge variant={profile.enabled ? "default" : "destructive"}>
            {profile.activationStatus === "draft"
              ? "Bozza"
              : profile.enabled
                ? "Attivo"
                : "Disabilitato"}
          </Badge>
          <Badge variant="outline">{profile.role || "user"}</Badge>
          {profile.assignedRoles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </>
      }
      actions={
        <CollaboratorReportButton domain={domain} userId={profile.id} />
      }
      accentColor={profile.color || undefined}
    >
      {/* KPI tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card/95 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {kpi.label}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${kpi.tone ?? "text-foreground"}`}
            >
              {kpi.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* Hours chart */}
      <DetailSheetSection
        title="Ore lavorate"
        description="Registrazioni timetracking degli ultimi 12 mesi"
      >
        <CollaboratorHoursChart
          perMonth={data.hoursPerMonth}
          perWeek={data.hoursPerWeek}
        />
      </DetailSheetSection>

      {/* Profile */}
      <DetailSheetSection title="Dati anagrafici">
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">
              {profile.email || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ruolo aziendale</dt>
            <dd className="font-medium text-foreground">
              {profile.companyRole || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reparti</dt>
            <dd className="font-medium text-foreground">
              {profile.assignedRoles.length > 0
                ? profile.assignedRoles.join(", ")
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nel sito dal</dt>
            <dd className="font-medium text-foreground">
              {formatDate(profile.joinedSiteAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ore contrattuali</dt>
            <dd className="font-medium text-foreground">
              {profile.weeklyHours} h/settimana
            </dd>
          </div>
          {isAdmin && (
            <div>
              <dt className="text-muted-foreground">Costo orario</dt>
              <dd className="font-medium text-foreground">
                {profile.hourlyRate != null
                  ? `CHF ${profile.hourlyRate.toLocaleString("it-CH")}`
                  : "-"}
              </dd>
            </div>
          )}
        </dl>
      </DetailSheetSection>

      {/* Projects */}
      <DetailSheetSection
        title="Progetti e attività"
        description="Progetti con ore registrate negli ultimi 12 mesi"
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/sites/${domain}/projects`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Apri progetti
            </Link>
          </Button>
        }
      >
        {data.projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nessuna registrazione ore negli ultimi 12 mesi.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Progetto / attività</th>
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 text-right font-medium">Ore</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Registrazioni
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Ultima attività
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((project, index) => (
                  <tr
                    key={project.key}
                    className={index % 2 === 1 ? "bg-muted/30" : undefined}
                  >
                    <td className="px-3 py-2 font-medium text-foreground">
                      {project.label}
                      {project.isInternal && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Interna
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {project.client || "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {formatHours(project.hours)}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {project.entries}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {formatDate(project.lastEntryAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSheetSection>

      {/* Attendance + leave */}
      <DetailSheetSection
        title="Presenze e ferie"
        description={`Anno ${currentYear}`}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Giorni per stato
            </p>
            {Object.keys(data.attendanceCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna presenza registrata quest&apos;anno.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.attendanceCounts).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="rounded-lg border bg-card px-3 py-1.5 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {ATTENDANCE_LABELS[status] || status}
                      </span>{" "}
                      <span className="font-semibold text-foreground">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Richieste recenti
            </p>
            {data.leaveRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna richiesta di assenza.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {data.leaveRequests.map((request) => (
                  <li
                    key={request.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-1.5 text-sm"
                  >
                    <span className="text-foreground">
                      {ATTENDANCE_LABELS[request.leaveType] ||
                        request.leaveType}{" "}
                      <span className="text-muted-foreground">
                        {formatDate(request.startDate)} –{" "}
                        {formatDate(request.endDate)}
                      </span>
                    </span>
                    <Badge
                      variant={
                        request.status === "approved"
                          ? "default"
                          : request.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {LEAVE_STATUS_LABELS[request.status] || request.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DetailSheetSection>

      {/* Placeholders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSheetSection title="Documenti">
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="In arrivo"
            description="L'archivio documenti del collaboratore (contratti, certificati) sarà disponibile in una prossima versione."
            className="border-none bg-transparent"
          />
        </DetailSheetSection>
        <DetailSheetSection title="Piano di formazione">
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title="In arrivo"
            description="Il piano di formazione interno con corsi e scadenze sarà disponibile in una prossima versione."
            className="border-none bg-transparent"
          />
        </DetailSheetSection>
      </div>
    </DetailSheetLayout>
  );
}
