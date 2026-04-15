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

function formatTechnician(project: NormalizedProjectLocation): string {
  if (!project.primaryTechnician) {
    return "Non assegnato";
  }
  if (project.technicianCount <= 1) {
    return project.primaryTechnician;
  }
  return `${project.primaryTechnician} +${project.technicianCount - 1}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function ActiveProjectsMap({ projects, domain }: ActiveProjectsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
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

  const applyMarkers = useCallback(async () => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) {
      return;
    }

    const L = await import("leaflet");
    layer.clearLayers();

    const markerIcon = L.divIcon({
      className: "dashboard-map-pin",
      html: '<span class="dashboard-map-pin-dot"></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10],
    });

    geolocatedProjects.forEach((project) => {
      const name = escapeHtml(project.name || "");
      const status = escapeHtml(project.status || "");
      const addr = escapeHtml(project.fullAddress || "Indirizzo non disponibile");
      const tech = escapeHtml(formatTechnician(project));

      const marker = L.marker([project.coordinates!.lat, project.coordinates!.lng], {
        icon: markerIcon,
      });
      marker.bindPopup(
        `
          <div class="min-w-[190px] space-y-2 text-xs text-slate-200">
            <div class="space-y-1">
              <p class="text-sm font-semibold text-white">${name}</p>
              <p class="text-slate-400">${status}</p>
            </div>
            <p class="leading-relaxed text-slate-300">${addr}</p>
            <p class="text-slate-300"><span class="font-medium text-slate-100">Tecnico:</span> ${tech}</p>
            <a class="inline-flex items-center rounded-md border border-blue-400/50 bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-100 transition hover:bg-blue-500/35" href="/sites/${domain}/projects?edit=${project.id}">Apri scheda progetto</a>
          </div>
        `,
        { className: "dashboard-map-popup" },
      );
      marker.addTo(layer);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, animate: false });
    } else {
      map.setView(mapCenter, 6, { animate: false });
    }
  }, [domain, geolocatedProjects, mapCenter, points]);

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
