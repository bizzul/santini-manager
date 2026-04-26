"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { DashboardProjectLocation } from "@/lib/server-data";
import { useActiveProjectMap } from "@/hooks/use-active-project-map";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ActiveProjectsMap = dynamic(() => import("@/components/dashboard/ActiveProjectsMap"), {
  ssr: false,
});

const DEFAULT_MARKER_COLOR = "#38bdf8";
const NO_CATEGORY_VALUE = "__none__";

type ProjectMapStatusFilter = "all" | DashboardProjectLocation["mapStatus"];

const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectMapStatusFilter;
  label: string;
}> = [
  { value: "in_progress", label: "In corso" },
  { value: "completed", label: "Ultimati" },
  { value: "offer", label: "Offerte" },
  { value: "all", label: "Tutti" },
];

interface ActiveProjectsMapCardProps {
  projects: DashboardProjectLocation[];
  domain: string;
  className?: string;
  mapHeightClassName?: string;
}

interface CategoryOption {
  value: string;
  label: string;
  color: string;
}

export default function ActiveProjectsMapCard({
  projects,
  domain,
  className,
  mapHeightClassName = "h-[420px]",
}: ActiveProjectsMapCardProps) {
  const [statusFilter, setStatusFilter] = useState<ProjectMapStatusFilter>("in_progress");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);

  const statusFilteredProjects = useMemo(
    () =>
      projects.filter((project) => statusFilter === "all" || project.mapStatus === statusFilter),
    [projects, statusFilter],
  );

  const { projects: normalizedProjects, geocoding } = useActiveProjectMap(
    statusFilteredProjects,
    domain,
  );

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, CategoryOption>();
    let hasNone = false;

    normalizedProjects.forEach((project) => {
      if (project.categoryId != null) {
        const key = String(project.categoryId);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            value: key,
            label: project.categoryName || `Categoria #${project.categoryId}`,
            color: project.categoryColor || DEFAULT_MARKER_COLOR,
          });
        } else if ((!existing.color || existing.color === DEFAULT_MARKER_COLOR) && project.categoryColor) {
          existing.color = project.categoryColor;
        }
      } else {
        hasNone = true;
      }
    });

    const options = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
    if (hasNone) {
      options.push({
        value: NO_CATEGORY_VALUE,
        label: "Senza categoria",
        color: DEFAULT_MARKER_COLOR,
      });
    }
    return options;
  }, [normalizedProjects]);

  const filteredProjects = useMemo(
    () =>
      normalizedProjects.filter((project) => {
        const categoryMatch =
          categoryFilter.length === 0 ||
          categoryFilter.includes(
            project.categoryId != null ? String(project.categoryId) : NO_CATEGORY_VALUE,
          );

        return categoryMatch;
      }),
    [normalizedProjects, categoryFilter],
  );

  const visibleProjects = useMemo(
    () => filteredProjects.filter((project) => Boolean(project.coordinates)),
    [filteredProjects],
  );

  const filteredUnresolvedCount = useMemo(
    () => filteredProjects.filter((project) => !project.coordinates).length,
    [filteredProjects],
  );

  const toggleCategory = (value: string) => {
    setCategoryFilter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const categoryTriggerLabel = (() => {
    if (categoryFilter.length === 0) return "Tutte le categorie";
    if (categoryFilter.length === 1) {
      return categoryOptions.find((o) => o.value === categoryFilter[0])?.label || "1 categoria";
    }
    return `${categoryFilter.length} categorie selezionate`;
  })();

  const triggerSelectedColors = categoryOptions
    .filter((o) => categoryFilter.includes(o.value))
    .slice(0, 4);

  return (
    <div className={cn("dashboard-panel p-6 space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="dashboard-panel-title">Mappa</h3>
          <p className="dashboard-panel-subtitle">
            Progetti geolocalizzati da coordinate o indirizzo cliente
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-100">
          {visibleProjects.length} cantieri visibili
        </span>
      </div>

      <div className="dashboard-panel-inner flex flex-wrap gap-2 p-2">
        <select
          aria-label="Stato"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ProjectMapStatusFilter)}
          className="h-9 min-w-44 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-xs font-medium text-slate-100 outline-none transition hover:border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        >
          {PROJECT_STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        {categoryOptions.length > 0 && (
          <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-9 min-w-56 items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-xs font-medium text-slate-100 outline-none transition hover:border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              >
                <span className="flex items-center gap-2 truncate">
                  {triggerSelectedColors.length > 0 && (
                    <span className="flex -space-x-1">
                      {triggerSelectedColors.map((option) => (
                        <span
                          key={option.value}
                          className="h-3 w-3 rounded-full ring-1 ring-slate-900"
                          style={{ background: option.color }}
                        />
                      ))}
                    </span>
                  )}
                  <span className="truncate">{categoryTriggerLabel}</span>
                </span>
                <div className="flex items-center gap-1">
                  {categoryFilter.length > 0 && (
                    <X
                      className="h-3.5 w-3.5 text-slate-400 hover:text-slate-100"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setCategoryFilter([]);
                      }}
                    />
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="z-50 w-64 border-slate-700 bg-slate-900/95 p-1 text-slate-100 shadow-xl backdrop-blur"
            >
              <div className="max-h-72 overflow-y-auto py-1">
                {categoryOptions.map((option) => {
                  const selected = categoryFilter.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleCategory(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                        selected
                          ? "bg-slate-800 text-white"
                          : "text-slate-200 hover:bg-slate-800/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          selected
                            ? "border-blue-400 bg-blue-500/80 text-white"
                            : "border-slate-600 bg-transparent",
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ background: option.color }}
                      />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {categoryFilter.length > 0 && (
                <div className="border-t border-slate-700/70 p-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter([])}
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  >
                    Azzera selezione
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/60",
          mapHeightClassName,
        )}
      >
        <ActiveProjectsMap
          key={`${statusFilter}:${visibleProjects.map((project) => project.id).join(",")}`}
          projects={visibleProjects}
          domain={domain}
        />

        {visibleProjects.length === 0 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 max-w-lg -translate-x-1/2 px-4 text-center">
            <div className="pointer-events-none space-y-2 rounded-lg border border-slate-700/70 bg-slate-950/80 px-4 py-3 shadow-lg backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-100">
                {geocoding ? "Geocodifica progetti in corso..." : "Nessun progetto geolocalizzabile"}
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

      {filteredUnresolvedCount > 0 && (
        <p className="dashboard-panel-subtitle">
          {filteredUnresolvedCount} progetto/i esclusi: indirizzo non valido o non geocodificabile.
        </p>
      )}
    </div>
  );
}
