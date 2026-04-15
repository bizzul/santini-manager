"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { NormalizedProjectLocation } from "@/utils/project-location-map";

interface ActiveProjectsMapProps {
  projects: NormalizedProjectLocation[];
  domain: string;
}

const markerIcon = L.divIcon({
  className: "dashboard-map-pin",
  html: '<span class="dashboard-map-pin-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

function MapBoundsUpdater({
  points,
}: {
  points: Array<[number, number]>;
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14, animate: false });
  }, [map, points]);

  return null;
}

function MapResizeUpdater() {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    };

    const container = map.getContainer();
    const observer = new ResizeObserver(() => invalidate());
    observer.observe(container);
    if (container.parentElement) {
      observer.observe(container.parentElement);
    }

    window.addEventListener("resize", invalidate);
    const frameId = window.requestAnimationFrame(invalidate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
      window.cancelAnimationFrame(frameId);
    };
  }, [map]);

  return null;
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

export default function ActiveProjectsMap({ projects, domain }: ActiveProjectsMapProps) {
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

  const mapCenter = points[0] || [45.4642, 9.19];

  return (
    <MapContainer
      center={mapCenter}
      zoom={6}
      scrollWheelZoom={true}
      dragging={true}
      doubleClickZoom={true}
      boxZoom={true}
      zoomControl={true}
      touchZoom={true}
      className="h-full w-full rounded-xl"
      style={{ height: "100%", width: "100%" }}
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
      />

      <MapResizeUpdater />
      <MapBoundsUpdater points={points} />

      {geolocatedProjects.map((project) => (
        <Marker
          key={project.id}
          position={[project.coordinates!.lat, project.coordinates!.lng]}
          icon={markerIcon}
        >
          <Popup className="dashboard-map-popup" closeButton>
            <div className="min-w-[190px] space-y-2 text-xs text-slate-200">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">{project.name}</p>
                <p className="text-slate-400">{project.status}</p>
              </div>
              <p className="leading-relaxed text-slate-300">
                {project.fullAddress || "Indirizzo non disponibile"}
              </p>
              <p className="text-slate-300">
                <span className="font-medium text-slate-100">Tecnico:</span>{" "}
                {formatTechnician(project)}
              </p>
              <Link
                href={`/sites/${domain}/projects?edit=${project.id}`}
                className="inline-flex items-center rounded-md border border-blue-400/50 bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-100 transition hover:bg-blue-500/35"
              >
                Apri scheda progetto
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
