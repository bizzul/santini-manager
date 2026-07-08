"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatEUDate } from "./types";
import type { MapData } from "@/lib/momentum-data";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const TICINO_CENTER: [number, number] = [46.19, 9.02];
const TICINO_ZOOM = 10;

type LayerKey = "location" | "passati" | "pianificazione" | "offerte";

const LAYER_META: Record<LayerKey, { label: string; color: string }> = {
  location: { label: "Location", color: "#2563eb" },
  passati: { label: "Eventi passati", color: "#6b7280" },
  pianificazione: { label: "Eventi in pianificazione", color: "#16a34a" },
  offerte: { label: "Offerte attive", color: "#f59e0b" },
};

interface MarkerPoint {
  lat: number;
  lng: number;
  color: string;
  html: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ACTIVE_OFFER_STATI = [
  "richiesta",
  "in_elaborazione",
  "offerta_inviata",
  "in_trattativa",
];
const PLANNING_STATI = [
  "to_plan",
  "planning",
  "planned",
  "confirmed",
  "live",
];

export default function MomentumMap({
  data,
  domain,
}: {
  data: MapData;
  domain: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = React.useRef<import("leaflet").LayerGroup | null>(null);
  const [ready, setReady] = React.useState(false);
  const [enabled, setEnabled] = React.useState<Record<LayerKey, boolean>>({
    location: true,
    passati: true,
    pianificazione: true,
    offerte: true,
  });

  const pointsByLayer = React.useMemo<Record<LayerKey, MarkerPoint[]>>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const location: MarkerPoint[] = data.locations
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({
        lat: l.lat!,
        lng: l.lng!,
        color: LAYER_META.location.color,
        html: `<strong>${escapeHtml(l.nome)}</strong><br/>${escapeHtml(
          l.citta || l.indirizzo || "Location"
        )}`,
      }));

    const passati: MarkerPoint[] = [];
    const pianificazione: MarkerPoint[] = [];
    for (const e of data.eventi) {
      const lat = e.lat ?? e.locLat;
      const lng = e.lng ?? e.locLng;
      if (lat == null || lng == null) continue;
      const isPast = e.data_evento
        ? new Date(e.data_evento) < today
        : false;
      const href = `/sites/${domain}/momentum/eventi/${e.id}`;
      const html = `<strong>${escapeHtml(e.titolo)}</strong><br/>${
        e.data_evento ? escapeHtml(formatEUDate(e.data_evento)) : ""
      }<br/><a href="${href}">Apri scheda evento</a>`;
      if (isPast) {
        passati.push({ lat, lng, color: LAYER_META.passati.color, html });
      } else if (PLANNING_STATI.includes(e.stato_plan)) {
        pianificazione.push({
          lat,
          lng,
          color: LAYER_META.pianificazione.color,
          html,
        });
      }
    }

    const offerte: MarkerPoint[] = data.offerte
      .filter(
        (o) =>
          o.lat != null &&
          o.lng != null &&
          ACTIVE_OFFER_STATI.includes(o.stato)
      )
      .map((o) => ({
        lat: o.lat!,
        lng: o.lng!,
        color: LAYER_META.offerte.color,
        html: `<strong>${escapeHtml(o.titolo)}</strong><br/>${
          o.data_evento_prevista
            ? escapeHtml(formatEUDate(o.data_evento_prevista))
            : ""
        }<br/><a href="/sites/${domain}/momentum/vendita">Vai a Vendita</a>`,
      }));

    return { location, passati, pianificazione, offerte };
  }, [data, domain]);

  // Init map once.
  React.useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, {
        center: TICINO_CENTER,
        zoom: TICINO_ZOOM,
        scrollWheelZoom: true,
      });
      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      requestAnimationFrame(() => {
        map.invalidateSize();
        setReady(true);
      });
    }
    void init();
    return () => {
      cancelled = true;
      setReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Redraw markers on toggle / data change.
  React.useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const L = await import("leaflet");
      const group = layerGroupRef.current;
      if (!group || cancelled) return;
      group.clearLayers();
      (Object.keys(pointsByLayer) as LayerKey[]).forEach((key) => {
        if (!enabled[key]) return;
        for (const p of pointsByLayer[key]) {
          L.circleMarker([p.lat, p.lng], {
            radius: 8,
            color: "#ffffff",
            weight: 2,
            fillColor: p.color,
            fillOpacity: 0.9,
          })
            .bindPopup(p.html)
            .addTo(group);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, enabled, pointsByLayer]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(LAYER_META) as LayerKey[]).map((key) => {
          const meta = LAYER_META[key];
          const isOn = enabled[key];
          const count = pointsByLayer[key].length;
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setEnabled((cur) => ({ ...cur, [key]: !cur[key] }))
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-opacity",
                isOn ? "opacity-100" : "opacity-40"
              )}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label}
              <span className="text-xs text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>
      <div
        ref={containerRef}
        className="leaflet-container h-[600px] w-full overflow-hidden rounded-xl border"
      />
    </div>
  );
}
