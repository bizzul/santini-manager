"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatEUDate, FORNITORE_CATEGORIA_LABEL } from "./types";
import type { MapData } from "@/lib/momentum-data";
import { geocodeAddress } from "@/utils/project-location-map";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const TICINO_CENTER: [number, number] = [46.19, 9.02];
const TICINO_ZOOM = 10;

type LayerKey = "eventi" | "fornitori" | "location" | "offerte";

const LAYER_META: Record<LayerKey, { label: string; color: string }> = {
  eventi: { label: "Eventi", color: "#16a34a" },
  fornitori: { label: "Fornitori", color: "#a855f7" },
  location: { label: "Location", color: "#2563eb" },
  offerte: { label: "Offerte", color: "#f59e0b" },
};

const LAYER_ORDER: LayerKey[] = ["eventi", "fornitori", "location", "offerte"];

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
    eventi: true,
    fornitori: true,
    location: true,
    offerte: true,
  });

  // Fornitori have no coordinates by default: geocode their address client-side
  // (cached via localStorage) and merge the resolved points into the layer.
  const [geocodedFornitori, setGeocodedFornitori] = React.useState<
    Record<string, { lat: number; lng: number }>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    const toGeocode = data.fornitori.filter(
      (f) => (f.lat == null || f.lng == null) && (f.indirizzo || f.citta)
    );
    if (toGeocode.length === 0) return;
    void (async () => {
      for (const f of toGeocode) {
        if (cancelled) return;
        const address = [f.indirizzo, f.citta, "Svizzera"]
          .filter(Boolean)
          .join(", ");
        const point = await geocodeAddress(address, "momentum:fornitore");
        if (cancelled || !point) continue;
        setGeocodedFornitori((cur) => ({
          ...cur,
          [f.id]: { lat: point.lat, lng: point.lng },
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.fornitori]);

  const pointsByLayer = React.useMemo<Record<LayerKey, MarkerPoint[]>>(() => {
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

    const fornitori: MarkerPoint[] = data.fornitori
      .map((f) => {
        const coords =
          f.lat != null && f.lng != null
            ? { lat: f.lat, lng: f.lng }
            : geocodedFornitori[f.id];
        if (!coords) return null;
        const categoriaLabel =
          FORNITORE_CATEGORIA_LABEL[f.categoria] ?? f.categoria;
        const luogo = f.citta || f.indirizzo;
        return {
          lat: coords.lat,
          lng: coords.lng,
          color: LAYER_META.fornitori.color,
          html: `<strong>${escapeHtml(f.nome)}</strong><br/>${escapeHtml(
            categoriaLabel
          )}${luogo ? `<br/>${escapeHtml(luogo)}` : ""}`,
        } as MarkerPoint;
      })
      .filter((p): p is MarkerPoint => p !== null);

    const eventi: MarkerPoint[] = [];
    for (const e of data.eventi) {
      const lat = e.lat ?? e.locLat;
      const lng = e.lng ?? e.locLng;
      if (lat == null || lng == null) continue;
      const href = `/sites/${domain}/momentum/eventi/${e.id}`;
      const dateLabel = e.data_evento
        ? escapeHtml(formatEUDate(e.data_evento))
        : "Data da definire";
      eventi.push({
        lat,
        lng,
        color: LAYER_META.eventi.color,
        html: `<strong>${escapeHtml(
          e.titolo
        )}</strong><br/>${dateLabel}<br/><a href="${href}">Apri scheda evento</a>`,
      });
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

    return { eventi, fornitori, location, offerte };
  }, [data, domain, geocodedFornitori]);

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
      LAYER_ORDER.forEach((key) => {
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
        {LAYER_ORDER.map((key) => {
          const meta = LAYER_META[key];
          const isOn = enabled[key];
          const count = pointsByLayer[key].length;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isOn}
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
