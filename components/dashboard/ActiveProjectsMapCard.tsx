"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { DashboardProjectLocation } from "@/lib/server-data";
import { useActiveProjectMap } from "@/hooks/use-active-project-map";
import { cn } from "@/lib/utils";

const ActiveProjectsMap = dynamic(() => import("@/components/dashboard/ActiveProjectsMap"), {
  ssr: false,
});

interface ActiveProjectsMapCardProps {
  projects: DashboardProjectLocation[];
  domain: string;
  className?: string;
  mapHeightClassName?: string;
}

export default function ActiveProjectsMapCard({
  projects,
  domain,
  className,
  mapHeightClassName = "h-[420px]",
}: ActiveProjectsMapCardProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const { projects: normalizedProjects, geocoding, unresolvedCount } = useActiveProjectMap(
    projects,
    domain,
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(normalizedProjects.map((project) => project.status).filter(Boolean))).sort(),
    [normalizedProjects],
  );

  const technicianOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedProjects
            .map((project) => project.primaryTechnician)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [normalizedProjects],
  );

  const visibleProjects = useMemo(
    () =>
      normalizedProjects.filter((project) => {
        const hasCoordinates = Boolean(project.coordinates);
        if (!hasCoordinates) return false;

        const statusMatch = statusFilter === "all" || project.status === statusFilter;
        const technicianMatch =
          technicianFilter === "all" || project.primaryTechnician === technicianFilter;
        return statusMatch && technicianMatch;
      }),
    [normalizedProjects, statusFilter, technicianFilter],
  );

  return (
    <div className={cn("dashboard-panel p-6 space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="dashboard-panel-title">Mappa Cantieri Attivi</h3>
          <p className="dashboard-panel-subtitle">
            Progetti in corso geolocalizzati da coordinate o indirizzo cliente
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-100">
          {visibleProjects.length} cantieri visibili
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="min-w-44 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-blue-400"
        >
          <option value="all">Tutti gli stati</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={technicianFilter}
          onChange={(event) => setTechnicianFilter(event.target.value)}
          className="min-w-44 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-blue-400"
        >
          <option value="all">Tutti i tecnici</option>
          {technicianOptions.map((technician) => (
            <option key={technician} value={technician}>
              {technician}
            </option>
          ))}
        </select>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/60",
          mapHeightClassName,
        )}
      >
        <ActiveProjectsMap projects={visibleProjects} domain={domain} />

        {visibleProjects.length === 0 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-lg -translate-x-1/2 px-4 text-center">
            <div className="pointer-events-none space-y-2 rounded-lg border border-slate-700/70 bg-slate-950/80 px-4 py-3 shadow-lg backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-100">
                {geocoding ? "Geocodifica cantieri in corso..." : "Nessun cantiere geolocalizzabile"}
              </p>
              <p className="dashboard-panel-subtitle mx-auto max-w-lg">
                {geocoding
                  ? "Sto completando la risoluzione indirizzi tramite OpenStreetMap Nominatim."
                  : "La mappa resta visibile: aggiungi un indirizzo valido al progetto o coordinate al cliente per mostrare i marker."}
              </p>
            </div>
          </div>
        )}
      </div>

      {unresolvedCount > 0 && (
        <p className="dashboard-panel-subtitle">
          {unresolvedCount} progetto/i esclusi: indirizzo non valido o non geocodificabile.
        </p>
      )}
    </div>
  );
}
