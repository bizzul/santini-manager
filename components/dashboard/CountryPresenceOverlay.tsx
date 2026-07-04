"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Factory, FileText, Loader2, Store, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geocodeAddress } from "@/utils/project-location-map";
import { COUNTRY_CAPITALS, type SelectedCountry } from "@/lib/map-capitals";
import { WORLD_COUNTRIES_GEOJSON_URL } from "@/lib/map-highlight";
import { countries as ISO2_COUNTRIES } from "@/components/clients/countries";

const CLIENT_COLOR = "#22c55e"; // green
const RESELLER_COLOR = "#ef4444"; // red

interface CountryPresenceOverlayProps {
  country: SelectedCountry | null;
  domain: string;
  onClose: () => void;
}

type PresenceClient = {
  id: number;
  name: string;
  city: string;
  countryCode: string;
};

type PresenceReseller = {
  id: number;
  name: string;
  zipCity: string;
  countryCode: string;
};

type PlacedPoint = {
  key: string;
  kind: "client" | "reseller";
  name: string;
  label: string;
  lat: number;
  lng: number;
};

const ISO2_TO_ENGLISH = new Map(
  ISO2_COUNTRIES.map((c) => [c.code.toUpperCase(), c.label]),
);

/** Robust ISO alpha-3 from a Natural Earth feature. */
function featureIso(props: Record<string, unknown>): string | null {
  const candidates = [props.ADM0_A3, props.ISO_A3_EH, props.ISO_A3];
  for (const c of candidates) {
    if (typeof c === "string" && c.length === 3 && c !== "-99") {
      return c.toUpperCase();
    }
  }
  return null;
}

export default function CountryPresenceOverlay({
  country,
  domain,
  onClose,
}: CountryPresenceOverlayProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const outlineLayerRef = useRef<import("leaflet").GeoJSON | null>(null);

  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<PlacedPoint[]>([]);
  const [stats, setStats] = useState({
    activeClients: 0,
    activeResellers: 0,
    offersInProgress: 0,
    projectsInProgress: 0,
  });

  const iso2 = country?.iso2 ?? "";
  const iso3 = country?.iso3 ?? "";
  const englishName = useMemo(
    () => ISO2_TO_ENGLISH.get(iso2.toUpperCase()) || country?.name || "",
    [iso2, country?.name],
  );

  // Close on Escape.
  useEffect(() => {
    if (!country) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [country, onClose]);

  // Fetch clients + resellers for the country, then geocode each point.
  useEffect(() => {
    if (!country) {
      setPoints([]);
      setStats({
        activeClients: 0,
        activeResellers: 0,
        offersInProgress: 0,
        projectsInProgress: 0,
      });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPoints([]);

    (async () => {
      try {
        const res = await fetch(
          `/api/sites/${domain}/country-presence?iso2=${encodeURIComponent(iso2)}`,
        );
        const data = (await res.json()) as {
          clients: PresenceClient[];
          resellers: PresenceReseller[];
          stats?: {
            activeClients: number;
            activeResellers: number;
            offersInProgress: number;
            projectsInProgress: number;
          };
        };
        if (cancelled) return;

        setStats(
          data.stats ?? {
            activeClients: data.clients?.length ?? 0,
            activeResellers: data.resellers?.length ?? 0,
            offersInProgress: 0,
            projectsInProgress: 0,
          },
        );

        const namespace = `country-presence:${domain}`;
        const placed: PlacedPoint[] = [];

        const clientJobs = (data.clients ?? []).map(async (c) => {
          if (!c.city) return;
          const point = await geocodeAddress(
            `${c.city}, ${englishName}`,
            namespace,
          );
          if (point) {
            placed.push({
              key: `c-${c.id}`,
              kind: "client",
              name: c.name,
              label: c.city,
              lat: point.lat,
              lng: point.lng,
            });
          }
        });

        const resellerJobs = (data.resellers ?? []).map(async (r) => {
          const query = r.zipCity || englishName;
          const point = await geocodeAddress(
            `${query}, ${englishName}`,
            namespace,
          );
          if (point) {
            placed.push({
              key: `r-${r.id}`,
              kind: "reseller",
              name: r.name,
              label: r.zipCity || "",
              lat: point.lat,
              lng: point.lng,
            });
          }
        });

        await Promise.all([...clientJobs, ...resellerJobs]);
        if (!cancelled) setPoints(placed);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [country, domain, iso2, englishName]);

  // Initialize the Leaflet map + draw the country outline; fit to its bounds.
  useEffect(() => {
    if (!country) return;
    let cancelled = false;

    (async () => {
      const el = mapContainerRef.current;
      if (!el || mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;

      const cap = COUNTRY_CAPITALS[iso3];
      const map = L.map(mapContainerRef.current, {
        center: cap ? [cap.lat, cap.lng] : [20, 0],
        zoom: cap ? 5 : 2,
        scrollWheelZoom: true,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));

      // Country outline + fit bounds.
      try {
        const res = await fetch(WORLD_COUNTRIES_GEOJSON_URL);
        if (!res.ok || cancelled || !mapRef.current) return;
        const fc = (await res.json()) as {
          features: Array<{ properties: Record<string, unknown>; geometry: unknown }>;
        };
        const match = fc.features.find(
          (f) => featureIso(f.properties) === iso3.toUpperCase(),
        );
        if (match && mapRef.current) {
          outlineLayerRef.current?.remove();
          const gj = L.geoJSON(
            match as unknown as import("geojson").Feature,
            {
              style: {
                color: "#38bdf8",
                weight: 1,
                opacity: 0.4,
                fillColor: "#38bdf8",
                fillOpacity: 0.04,
                interactive: false,
              },
            },
          ).addTo(mapRef.current);
          outlineLayerRef.current = gj;
          const b = gj.getBounds();
          if (b.isValid()) {
            mapRef.current.fitBounds(b, { padding: [40, 40], animate: false });
          }
        }
      } catch {
        // Outline unavailable: keep the capital-centered view.
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        outlineLayerRef.current = null;
      }
    };
  }, [country, iso3]);

  // Plot the geocoded markers whenever they change.
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    (async () => {
      const L = await import("leaflet");
      layer.clearLayers();
      const latlngs: [number, number][] = [];

      points.forEach((p) => {
        const color = p.kind === "reseller" ? RESELLER_COLOR : CLIENT_COLOR;
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: p.kind === "reseller" ? 9 : 7,
          color: "#0b1220",
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.95,
        });
        marker.bindTooltip(
          `<span style="font-weight:600">${p.name}</span>${
            p.label ? `<br/><span style="opacity:0.75">${p.label}</span>` : ""
          }`,
          { direction: "top", offset: [0, -6] },
        );
        marker.addTo(layer);
        latlngs.push([p.lat, p.lng]);
      });

      // Keep both the country and its points in view.
      if (latlngs.length > 0) {
        const outlineBounds = outlineLayerRef.current?.getBounds();
        const bounds = L.latLngBounds(latlngs);
        if (outlineBounds && outlineBounds.isValid()) bounds.extend(outlineBounds);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8, animate: true });
      }
    })();
  }, [points]);

  if (!country) return null;

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-slate-950">
      <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          {iso2 && (
            <Image
              src={`https://flagcdn.com/w80/${iso2.toLowerCase()}.png`}
              alt={country.name}
              width={44}
              height={33}
              className="h-auto w-11 rounded-sm shadow-md"
            />
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{country.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/70 px-2.5 py-1 text-xs text-white/85">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: RESELLER_COLOR }}
                />
                <Store className="h-3.5 w-3.5" />
                <strong className="font-semibold text-white">
                  {stats.activeResellers}
                </strong>
                rivenditori attivi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/70 px-2.5 py-1 text-xs text-white/85">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: CLIENT_COLOR }}
                />
                <Users className="h-3.5 w-3.5" />
                <strong className="font-semibold text-white">
                  {stats.activeClients}
                </strong>
                clienti attivi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/70 px-2.5 py-1 text-xs text-white/85">
                <FileText className="h-3.5 w-3.5 text-sky-400" />
                <strong className="font-semibold text-white">
                  {stats.offersInProgress}
                </strong>
                offerte in corso
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/70 px-2.5 py-1 text-xs text-white/85">
                <Factory className="h-3.5 w-3.5 text-amber-400" />
                <strong className="font-semibold text-white">
                  {stats.projectsInProgress}
                </strong>
                progetti in corso
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Geolocalizzazione…
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Chiudi"
            className="text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
        {!loading && points.length === 0 && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-[20] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900/85 px-4 py-3 text-center text-sm text-white/80 shadow-lg backdrop-blur">
            Nessun cliente o rivenditore geolocalizzabile per questo paese.
          </div>
        )}
      </div>
    </div>
  );
}
