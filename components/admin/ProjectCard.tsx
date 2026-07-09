"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutesAsHours } from "@/components/calendar/calendar-utils";
import {
  PROJECT_STAGE_COLUMNS,
  PROJECT_STAGE_LABELS,
  type ManagerProjectSummary,
} from "@/lib/manager-projects/types";

interface ProjectCardProps {
  project: ManagerProjectSummary;
  /** Link di destinazione al click (es. dettaglio progetto). */
  href?: string;
  className?: string;
}

function stageColor(stage: string): string | undefined {
  return PROJECT_STAGE_COLUMNS.find((c) => c.id === stage)?.color;
}

export function ProjectCard({ project, href, className }: ProjectCardProps) {
  const color = stageColor(project.stage);

  const body = (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 shadow-sm transition-colors hover:bg-surface",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted">
          {project.site.logo ? (
            <Image
              src={project.site.logo}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {project.site.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {project.site.organization_name || project.site.subdomain || "—"}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background"
          style={color ? { backgroundColor: color } : undefined}
        >
          {PROJECT_STAGE_LABELS[project.stage]}
        </span>
      </div>

      {(project.total_minutes !== undefined ||
        project.collaborators_count !== undefined) && (
        <div className="mt-2 flex items-center gap-3 border-t border-border/40 pt-2 text-xs text-muted-foreground">
          {project.total_minutes !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatMinutesAsHours(project.total_minutes)}
            </span>
          )}
          {project.collaborators_count !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {project.collaborators_count}
            </span>
          )}
        </div>
      )}

      {project.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {project.notes}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
