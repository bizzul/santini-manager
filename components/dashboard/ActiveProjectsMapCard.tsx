"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Maximize2, Minimize2, X } from "lucide-react";
import type { DashboardProjectLocation } from "@/lib/server-data";
import type { MapData } from "@/lib/momentum-data";
import type { MomentumMapPoint } from "@/components/dashboard/ActiveProjectsMap";
import { useActiveProjectMap } from "@/hooks/use-active-project-map";
import { cn } from "@/lib/utils";
import CountryPresenceOverlay from "@/components/dashboard/CountryPresenceOverlay";
import {
  COUNTRY_CAPITALS,
  type SelectedCountry,
} from "@/lib/map-capitals";
import {
  FORNITORE_CATEGORIA_LABEL,
  formatEUDate,
} from "@/components/momentum/types";
import { useSearchParams } from "next/navigation";
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

type MomentumCategory = "eventi" | "fornitori" | "location" | "offerte";

const MOMENTUM_LAYER_META: Record<
  MomentumCategory,
  { label: string; color: string }
> = {
  eventi: { label: "Eventi", color: "#16a34a" },
  fornitori: { label: "Fornitori", color: "#a855f7" },
  location: { label: "Location", color: "#2563eb" },
  offerte: { label: "Offerte", color: "#f59e0b" },
};

const MOMENTUM_CATEGORY_ORDER: MomentumCategory[] = [
  "eventi",
  "fornitori",
  "location",
  "offerte",
];

const ACTIVE_OFFER_STATI = [
  "richiesta",
  "in_elaborazione",
  "offerta_inviata",
  "in_trattativa",
];

function escapeMapHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  /** Map viewport height in px (applied inline to avoid JIT arbitrary-class flakiness). */
  mapHeightPx?: number;
  /** ISO alpha-3 codes of the countries to highlight on the map. */
  highlightCountries?: string[];
  /** Momentum entities (eventi/fornitori/location/offerte) to plot as selectable layers. */
  momentumData?: MapData;
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
  mapHeightPx = 520,
  highlightCountries,
  momentumData,
}: ActiveProjectsMapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [presenceCountry, setPresenceCountry] = useState<SelectedCountry | null>(
    null,
  );
  const searchParams = useSearchParams();

  // Deep-link: open the country overlay when ?country=ISO2 is present
  // (used by the dashboard-integration graph nodes).
  useEffect(() => {
    const iso2 = (searchParams.get("country") || "").toUpperCase();
    if (!iso2) return;
    const entry = Object.entries(COUNTRY_CAPITALS).find(
      ([, info]) => info.iso2 === iso2,
    );
    if (!entry) return;
    const [iso3, info] = entry;
    setPresenceCountry({
      iso3,
      iso2,
      name: info.name,
      capital: info.capital,
    });
  }, [searchParams]);

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

  const [statusFilter, setStatusFilter] = useState<ProjectMapStatusFilter>("in_progress");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [momentumEnabled, setMomentumEnabled] = useState<
    Record<MomentumCategory, boolean>
  >({ eventi: true, fornitori: true, location: true, offerte: true });

  const momentumPointsByCategory = useMemo<Record<MomentumCategory, MomentumMapPoint[]>>(() => {
    const empty: Record<MomentumCategory, MomentumMapPoint[]> = {
      eventi: [],
      fornitori: [],
      location: [],
      offerte: [],
    };
    if (!momentumData) return empty;

    empty.location = momentumData.locations
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({
        lat: l.lat!,
        lng: l.lng!,
        color: MOMENTUM_LAYER_META.location.color,
        html: `<strong>${escapeMapHtml(l.nome)}</strong><br/>${escapeMapHtml(
          l.citta || l.indirizzo || "Location",
        )}`,
      }));

    empty.fornitori = momentumData.fornitori
      .filter((f) => f.lat != null && f.lng != null)
      .map((f) => ({
        lat: f.lat!,
        lng: f.lng!,
        color: MOMENTUM_LAYER_META.fornitori.color,
        html: `<strong>${escapeMapHtml(f.nome)}</strong><br/>${escapeMapHtml(
          FORNITORE_CATEGORIA_LABEL[f.categoria] ?? f.categoria,
        )}${f.citta ? `<br/>${escapeMapHtml(f.citta)}` : ""}`,
      }));

    const eventi: MomentumMapPoint[] = [];
    for (const e of momentumData.eventi) {
      const lat = e.lat ?? e.locLat;
      const lng = e.lng ?? e.locLng;
      if (lat == null || lng == null) continue;
      const href = `/sites/${domain}/momentum/eventi/${e.id}`;
      const dateLabel = e.data_evento
        ? escapeMapHtml(formatEUDate(e.data_evento))
        : "Data da definire";
      eventi.push({
        lat,
        lng,
        color: MOMENTUM_LAYER_META.eventi.color,
        html: `<strong>${escapeMapHtml(
          e.titolo,
        )}</strong><br/>${dateLabel}<br/><a href="${href}">Apri scheda evento</a>`,
      });
    }
    empty.eventi = eventi;

    empty.offerte = momentumData.offerte
      .filter(
        (o) =>
          o.lat != null && o.lng != null && ACTIVE_OFFER_STATI.includes(o.stato),
      )
      .map((o) => ({
        lat: o.lat!,
        lng: o.lng!,
        color: MOMENTUM_LAYER_META.offerte.color,
        html: `<strong>${escapeMapHtml(o.titolo)}</strong>${
          o.data_evento_prevista
            ? `<br/>${escapeMapHtml(formatEUDate(o.data_evento_prevista))}`
            : ""
        }`,
      }));

    return empty;
  }, [momentumData, domain]);

  const hasMomentumData = useMemo(
    () =>
      MOMENTUM_CATEGORY_ORDER.some(
        (key) => momentumPointsByCategory[key].length > 0,
      ),
    [momentumPointsByCategory],
  );

  const momentumPoints = useMemo<MomentumMapPoint[]>(
    () =>
      MOMENTUM_CATEGORY_ORDER.flatMap((key) =>
        momentumEnabled[key] ? momentumPointsByCategory[key] : [],
      ),
    [momentumEnabled, momentumPointsByCategory],
  );

  const toggleMomentumCategory = (key: MomentumCategory) => {
    setMomentumEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    <div
      className={cn(
        isExpanded
          ? "fixed inset-0 z-[100] flex flex-col gap-4 bg-slate-950 p-4 md:p-6"
          : "dashboard-panel p-6 space-y-4",
        !isExpanded && className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="dashboard-panel-title">Mappa</h3>
          <div className="flex flex-wrap items-center gap-2">
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
              className="z-[110] w-64 border-slate-700 bg-slate-900/95 p-1 text-slate-100 shadow-xl backdrop-blur"
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
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-100">
            {visibleProjects.length} cantieri visibili
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
            aria-label={isExpanded ? "Riduci mappa" : "Espandi mappa"}
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {hasMomentumData && (
        <div className="flex flex-wrap items-center gap-2">
          {MOMENTUM_CATEGORY_ORDER.map((key) => {
            const meta = MOMENTUM_LAYER_META[key];
            const isOn = momentumEnabled[key];
            const count = momentumPointsByCategory[key].length;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggleMomentumCategory(key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-slate-500",
                  !isOn && "opacity-40",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: meta.color }}
                />
                {meta.label}
                <span className="text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/60",
          isExpanded ? "flex-1 min-h-0" : "",
        )}
        style={!isExpanded ? { height: mapHeightPx } : undefined}
      >
        <ActiveProjectsMap
          key={domain}
          projects={visibleProjects}
          domain={domain}
          doubleClickZoom={isExpanded}
          onDoubleClick={!isExpanded ? () => setIsExpanded(true) : undefined}
          highlightCountries={highlightCountries}
          momentumPoints={momentumPoints}
          onCountrySelect={setPresenceCountry}
          onCountryClick={setPresenceCountry}
        />

        {visibleProjects.length === 0 && momentumPoints.length === 0 && (
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

        {!isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="absolute right-2 top-2 z-20 rounded-lg border border-slate-700/50 bg-slate-900/80 p-1.5 text-slate-300 backdrop-blur-sm transition hover:border-slate-500 hover:text-slate-100"
            aria-label="Espandi mappa"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filteredUnresolvedCount > 0 && (
        <p className="dashboard-panel-subtitle">
          {filteredUnresolvedCount} progetto/i esclusi: indirizzo non valido o non geocodificabile.
        </p>
      )}

      <CountryPresenceOverlay
        country={presenceCountry}
        domain={domain}
        onClose={() => setPresenceCountry(null)}
      />
    </div>
  );
}
