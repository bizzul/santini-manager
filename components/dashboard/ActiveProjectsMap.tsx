"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedProjectLocation } from "@/utils/project-location-map";

/** OpenStreetMap standard tile layer (usage policy: https://operations.osmfoundation.org/policies/tiles/) */
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface ActiveProjectsMapProps {
  projects: NormalizedProjectLocation[];
  domain: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function hexToRgba(hex: string, alpha: number): string | null {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;
  if (expanded.length !== 6) return null;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getProjectHref(domain: string, projectId: number): string {
  return `/sites/${encodeURIComponent(domain)}/projects?edit=${projectId}`;
}

function formatProjectNumber(project: NormalizedProjectLocation): string {
  return project.uniqueCode || `#${project.id}`;
}

function buildProjectTooltipHtml(
  projects: NormalizedProjectLocation[],
  domain: string,
): string {
  const title =
    projects.length > 1
      ? `${projects.length} progetti in questa posizione`
      : "Progetto";

  const rows = projects
    .map((project) => {
      const href = getProjectHref(domain, project.id);
      const number = escapeHtml(formatProjectNumber(project));
      const name = escapeHtml(project.name || "Senza nome oggetto");
      const color = isValidHexColor(project.categoryColor) ? project.categoryColor! : "#38bdf8";
      return `
        <a class="dashboard-map-hover-row" href="${href}" data-project-href="${href}">
          <span class="dashboard-map-hover-dot" style="background:${color};"></span>
          <span class="dashboard-map-hover-number">${number}</span>
          <span class="dashboard-map-hover-name">${name}</span>
        </a>
      `;
    })
    .join("");

  return `
    <div class="dashboard-map-hover-card">
      <p class="dashboard-map-hover-title">${escapeHtml(title)}</p>
      <div class="dashboard-map-hover-list">${rows}</div>
    </div>
  `;
}

export default function ActiveProjectsMap({ projects, domain }: ActiveProjectsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const hoverTooltipRef = useRef<import("leaflet").Tooltip | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const geolocatedProjects = useMemo(
    () => projects.filter((project) => project.coordinates),
    [projects],
  );

  const points = useMemo(
    () =>
      geolocatedProjects.map((project) => [
        project.coordinates!.lat,
        project.coordinates!.lng,
      ] as [number, number]),
    [geolocatedProjects],
  );

  const mapCenter = useMemo<[number, number]>(
    () => points[0] || [45.4642, 9.19],
    [points],
  );

  const projectGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        lat: number;
        lng: number;
        projects: NormalizedProjectLocation[];
      }
    >();

    geolocatedProjects.forEach((project) => {
      const lat = project.coordinates!.lat;
      const lng = project.coordinates!.lng;
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      const existing = grouped.get(key);

      if (existing) {
        existing.projects.push(project);
        return;
      }

      grouped.set(key, {
        lat,
        lng,
        projects: [project],
      });
    });

    return Array.from(grouped.values());
  }, [geolocatedProjects]);

  const applyMarkers = useCallback(async () => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) {
      return;
    }

    const L = await import("leaflet");
    hoverTooltipRef.current?.remove();
    hoverTooltipRef.current = null;
    layer.clearLayers();

    const DEFAULT_MARKER_COLOR = "#38bdf8";
    let activeTooltip: import("leaflet").Tooltip | null = null;
    let closeTooltipTimer: number | null = null;
    let tooltipHovered = false;

    const clearCloseTimer = () => {
      if (closeTooltipTimer !== null) {
        window.clearTimeout(closeTooltipTimer);
        closeTooltipTimer = null;
      }
    };

    const closeActiveTooltip = () => {
      clearCloseTimer();
      if (tooltipHovered) return;
      activeTooltip?.remove();
      if (hoverTooltipRef.current === activeTooltip) {
        hoverTooltipRef.current = null;
      }
      activeTooltip = null;
    };

    const scheduleTooltipClose = () => {
      clearCloseTimer();
      closeTooltipTimer = window.setTimeout(closeActiveTooltip, 180);
    };

    const openTooltipForGroup = (
      group: {
        lat: number;
        lng: number;
        projects: NormalizedProjectLocation[];
      },
    ) => {
      clearCloseTimer();
      tooltipHovered = false;
      activeTooltip?.remove();
      activeTooltip = L.tooltip({
        className: "dashboard-map-hover-tooltip",
        direction: "top",
        interactive: true,
        offset: [0, -14],
        opacity: 1,
      })
        .setLatLng([group.lat, group.lng])
        .setContent(buildProjectTooltipHtml(group.projects, domain))
        .openOn(map);
      hoverTooltipRef.current = activeTooltip;

      window.requestAnimationFrame(() => {
        const tooltipElement = activeTooltip?.getElement();
        if (!tooltipElement) return;

        tooltipElement.addEventListener("mouseenter", () => {
          tooltipHovered = true;
          clearCloseTimer();
        });
        tooltipElement.addEventListener("mouseleave", () => {
          tooltipHovered = false;
          scheduleTooltipClose();
        });
        tooltipElement.addEventListener("click", (event) => {
          const target = event.target as HTMLElement | null;
          const link = target?.closest<HTMLAnchorElement>("a[data-project-href]");
          if (!link) return;

          event.preventDefault();
          window.location.href = link.href;
        });
      });
    };

    projectGroups.forEach((group) => {
      const project = group.projects[0];
      const color = isValidHexColor(project.categoryColor) ? project.categoryColor! : DEFAULT_MARKER_COLOR;
      const ringColor = hexToRgba(color, 0.28) || "rgba(14, 165, 233, 0.25)";
      const groupCount = group.projects.length;

      const markerIcon = L.divIcon({
        className: "dashboard-map-pin",
        html: `
          <span class="dashboard-map-pin-dot" style="background:${color};box-shadow:0 0 0 4px ${ringColor};"></span>
          ${groupCount > 1 ? `<span class="dashboard-map-pin-count">${groupCount}</span>` : ""}
        `,
        iconSize: groupCount > 1 ? [24, 24] : [16, 16],
        iconAnchor: groupCount > 1 ? [12, 12] : [8, 8],
      });

      const marker = L.marker([group.lat, group.lng], {
        icon: markerIcon,
      });

      marker.on("mouseover", () => openTooltipForGroup(group));
      marker.on("mouseout", scheduleTooltipClose);
      marker.on("click", () => {
        window.location.href = getProjectHref(domain, project.id);
      });
      marker.addTo(layer);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, animate: false });
    } else {
      map.setView(mapCenter, 6, { animate: false });
    }
  }, [domain, mapCenter, points, projectGroups]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let onResize: (() => void) | null = null;

    async function initMap() {
      const el = mapContainerRef.current;
      if (!el || mapRef.current) {
        return;
      }

      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current) {
        return;
      }

      const map = L.map(mapContainerRef.current, {
        center: mapCenter,
        zoom: 6,
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: true,
        boxZoom: true,
        zoomControl: true,
        touchZoom: true,
      });

      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);

      const invalidate = () => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      };
      onResize = invalidate;
      resizeObserver = new ResizeObserver(invalidate);
      resizeObserver.observe(mapContainerRef.current);
      window.addEventListener("resize", invalidate);
      requestAnimationFrame(() => {
        invalidate();
        setMapReady(true);
      });
    }

    void initMap();

    return () => {
      cancelled = true;
      setMapReady(false);
      resizeObserver?.disconnect();
      if (onResize) {
        window.removeEventListener("resize", onResize);
      }
      if (mapRef.current) {
        hoverTooltipRef.current?.remove();
        hoverTooltipRef.current = null;
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [mapCenter]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    void applyMarkers();
  }, [applyMarkers, mapReady]);

  return (
    <div className="absolute inset-0 z-[2] min-h-[200px]">
      {/* Sottile fallback OSM: se i tile Leaflet non caricano, resta comunque un riferimento geografico */}
      <iframe
        title="OpenStreetMap (fallback)"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full border-0 opacity-25"
        src="https://www.openstreetmap.org/export/embed.html?bbox=8.4,45.3,9.8,45.5&layer=mapnik"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div
        ref={mapContainerRef}
        className="leaflet-container relative z-[1] h-full w-full rounded-xl bg-transparent"
        style={{ minHeight: "100%" }}
      />
    </div>
  );
}
