"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TICINO_MAP_CENTER, TICINO_MAP_ZOOM } from "@/lib/campagna/config";
import type { ComuneAggregate } from "@/lib/campagna/server-data";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Coordinate note dei principali comuni ticinesi. Serve solo per posizionare le
 * bolle aggregate: i comuni non presenti restano nell'elenco laterale ma non
 * vengono plottati. Nessun dato nominativo viene mai geolocalizzato.
 */
const TICINO_COMUNI: Record<string, [number, number]> = {
  bellinzona: [46.1946, 9.0247],
  lugano: [46.0037, 8.9511],
  locarno: [46.1712, 8.7994],
  mendrisio: [45.8697, 8.9808],
  chiasso: [45.8331, 9.0316],
  biasca: [46.3597, 8.9706],
  ascona: [46.1547, 8.7714],
  minusio: [46.176, 8.815],
  losone: [46.168, 8.756],
  massagno: [46.0103, 8.9436],
  paradiso: [45.9928, 8.9469],
  viganello: [46.0125, 8.9636],
  agno: [45.9986, 8.9006],
  gambarogno: [46.128, 8.83],
  giubiasco: [46.175, 9.008],
  cadenazzo: [46.155, 8.945],
  arbedo: [46.219, 9.045],
  quinto: [46.518, 8.717],
  airolo: [46.528, 8.611],
  faido: [46.478, 8.801],
  acquarossa: [46.46, 8.943],
  blenio: [46.53, 8.98],
  capriasca: [46.08, 8.97],
  "riva san vitale": [45.895, 8.99],
  stabio: [45.851, 8.938],
  balerna: [45.845, 9.005],
  morbio: [45.845, 9.03],
  novazzano: [45.837, 8.99],
  vacallo: [45.847, 9.036],
  caslano: [45.968, 8.879],
  lamone: [46.04, 8.93],
  "monte carasso": [46.2, 9.0],
  gordola: [46.187, 8.864],
  tenero: [46.18, 8.85],
  cevio: [46.32, 8.6],
  maggia: [46.25, 8.71],
};

interface CampagnaTicinoMapProps {
  contattiPerComune: ComuneAggregate[];
}

function normalizeComune(name: string): string {
  return name.trim().toLowerCase();
}

export default function CampagnaTicinoMap({
  contattiPerComune,
}: CampagnaTicinoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const bubblesLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const plottable = useMemo(() => {
    return contattiPerComune
      .map((entry) => {
        const coords = TICINO_COMUNI[normalizeComune(entry.comune)];
        return coords
          ? { ...entry, lat: coords[0], lng: coords[1] }
          : null;
      })
      .filter((v): v is ComuneAggregate & { lat: number; lng: number } =>
        Boolean(v),
      );
  }, [contattiPerComune]);

  const maxCount = useMemo(
    () => plottable.reduce((max, e) => Math.max(max, e.count), 0),
    [plottable],
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      const el = mapContainerRef.current;
      if (!el || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [TICINO_MAP_CENTER.lat, TICINO_MAP_CENTER.lng],
        zoom: TICINO_MAP_ZOOM,
        scrollWheelZoom: true,
        zoomControl: true,
      });

      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      bubblesLayerRef.current = L.layerGroup().addTo(map);

      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        setMapReady(true);
      });
    }

    void initMap();

    return () => {
      cancelled = true;
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        bubblesLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      const layer = bubblesLayerRef.current;
      if (!layer || cancelled) return;
      layer.clearLayers();

      plottable.forEach((entry) => {
        const ratio = maxCount > 0 ? entry.count / maxCount : 0;
        const radius = 8 + ratio * 22;
        L.circleMarker([entry.lat, entry.lng], {
          radius,
          color: "#ffffff",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.55,
        })
          .bindTooltip(
            `<strong>${entry.comune}</strong><br/>${entry.count} contatti`,
            { direction: "top" },
          )
          .addTo(layer);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady, plottable, maxCount]);

  const unplotted = contattiPerComune.length - plottable.length;

  return (
    <div className="space-y-2">
      <div
        ref={mapContainerRef}
        className="leaflet-container h-[420px] w-full rounded-xl border border-border bg-surface"
      />
      <p className="text-xs text-muted-foreground">
        Bolle proporzionali al numero di contatti per comune (dato aggregato,
        nessun nominativo).
        {unplotted > 0
          ? ` ${unplotted} comuni senza coordinate note non sono mappati.`
          : ""}
      </p>
    </div>
  );
}
