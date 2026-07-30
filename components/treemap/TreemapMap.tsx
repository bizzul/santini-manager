"use client";

import * as React from "react";
import "leaflet/dist/leaflet.css";
import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
  TICINO_MAP_CENTER,
  TICINO_MAP_ZOOM,
  TICINO_MAX_BOUNDS,
  TICINO_MAX_ZOOM,
  TICINO_MIN_ZOOM,
  TM_SALUTE_COLORS,
  TM_SALUTE_LABELS,
  TM_MAP_MARKER_COLORS,
} from "@/lib/treemap/constants";
import type { TreemapAlberoMapRow } from "@/lib/treemap-data";
import { TM_MARKER_Z_INDEX } from "@/components/treemap/treemap-map-utils";
import type { MapContextMenuState } from "@/components/treemap/TreemapMapContextMenu";

export interface TreemapMapHandle {
  focusMarker: (alberoId: string | null) => void;
}

interface TreemapMapProps {
  /** Tutti gli alberi salvati — sempre tutti visibili sulla mappa */
  alberi: TreemapAlberoMapRow[];
  selectedAlberoId: string | null;
  drawerOpen: boolean;
  onSelectAlbero: (albero: TreemapAlberoMapRow, markerEl: HTMLElement | null) => void;
  onMapContextMenu: (menu: MapContextMenuState) => void;
}

const MARKER_RADIUS = 10;
const MARKER_RADIUS_SELECTED = 13;

const TreemapMap = React.forwardRef<TreemapMapHandle, TreemapMapProps>(
  function TreemapMap(
    { alberi, selectedAlberoId, drawerOpen, onSelectAlbero, onMapContextMenu },
    ref,
  ) {
    const onMapContextMenuRef = React.useRef(onMapContextMenu);
    const onSelectAlberoRef = React.useRef(onSelectAlbero);
    onMapContextMenuRef.current = onMapContextMenu;
    onSelectAlberoRef.current = onSelectAlbero;

    const wrapperRef = React.useRef<HTMLDivElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const mapRef = React.useRef<import("leaflet").Map | null>(null);
    const markersLayerRef = React.useRef<import("leaflet").LayerGroup | null>(
      null,
    );
    const geoLayersRef = React.useRef<import("leaflet").LayerGroup | null>(
      null,
    );
    const markerElementsRef = React.useRef<Map<string, HTMLElement>>(new Map());
    const initialFitDoneRef = React.useRef(false);
    const [mapReady, setMapReady] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      focusMarker(alberoId: string | null) {
        if (!alberoId) return;
        markerElementsRef.current.get(alberoId)?.focus();
      },
    }));

    React.useEffect(() => {
      let cancelled = false;
      let resizeObserver: ResizeObserver | null = null;

      async function init() {
        const container = containerRef.current;
        if (!container || mapRef.current) return;

        const L = await import("leaflet");
        if (cancelled || !containerRef.current) return;

        const map = L.map(container, {
          center: TICINO_MAP_CENTER,
          zoom: TICINO_MAP_ZOOM,
          minZoom: TICINO_MIN_ZOOM,
          maxZoom: TICINO_MAX_ZOOM,
          maxBounds: TICINO_MAX_BOUNDS,
          maxBoundsViscosity: 1.0,
          scrollWheelZoom: true,
        });

        L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_ATTRIBUTION,
          maxZoom: TICINO_MAX_ZOOM,
        }).addTo(map);

        geoLayersRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);

        const markerPane = map.getPane("markerPane");
        if (markerPane) markerPane.style.zIndex = "650";

        try {
          const [borderRes, maskRes] = await Promise.all([
            fetch("/geo/ticino.geojson"),
            fetch("/geo/ticino-mask.geojson"),
          ]);
          if (borderRes.ok && maskRes.ok) {
            const borderGeo = await borderRes.json();
            const maskGeo = await maskRes.json();
            if (!cancelled && geoLayersRef.current) {
              L.geoJSON(maskGeo, {
                style: {
                  fillColor: "#0f172a",
                  fillOpacity: 0.35,
                  color: "transparent",
                  weight: 0,
                },
                interactive: false,
              }).addTo(geoLayersRef.current);

              L.geoJSON(borderGeo, {
                style: {
                  fillColor: "transparent",
                  color: "#2563eb",
                  weight: 2,
                  opacity: 0.85,
                },
                interactive: false,
              }).addTo(geoLayersRef.current);
            }
          }
        } catch {
          // GeoJSON opzionale
        }

        mapRef.current = map;

        map.on("contextmenu", (e) => {
          e.originalEvent.preventDefault();
          onMapContextMenuRef.current({
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
          });
        });

        const invalidate = () => {
          map.invalidateSize({ pan: false, debounceMoveend: true });
        };

        if (wrapperRef.current) {
          resizeObserver = new ResizeObserver(invalidate);
          resizeObserver.observe(wrapperRef.current);
        }

        requestAnimationFrame(() => {
          invalidate();
          if (!cancelled) setMapReady(true);
        });
      }

      void init();

      return () => {
        cancelled = true;
        setMapReady(false);
        resizeObserver?.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        const container = containerRef.current;
        if (container) {
          delete (container as HTMLElement & { _leaflet_id?: number })._leaflet_id;
        }
        markersLayerRef.current = null;
        geoLayersRef.current = null;
        markerElementsRef.current.clear();
        initialFitDoneRef.current = false;
      };
    }, []);

    React.useEffect(() => {
      if (!mapReady) return;
      let cancelled = false;

      void (async () => {
        const L = await import("leaflet");
        const group = markersLayerRef.current;
        const map = mapRef.current;
        if (!group || !map || cancelled) return;

        group.clearLayers();
        markerElementsRef.current.clear();

        const sorted = [...alberi].sort(
          (a, b) =>
            TM_MARKER_Z_INDEX[a.stato_salute] -
            TM_MARKER_Z_INDEX[b.stato_salute],
        );

        const bounds = L.latLngBounds([]);

        for (const albero of sorted) {
          const lat = Number(albero.latitude);
          const lng = Number(albero.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          bounds.extend([lat, lng]);

          const color =
            TM_MAP_MARKER_COLORS[albero.stato_salute] ??
            TM_SALUTE_COLORS[albero.stato_salute];
          const selected = albero.albero_id === selectedAlberoId;
          const offlinePartial =
            albero.n_sensori_offline > 0 && albero.stato_salute !== "OFFLINE";

          const marker = L.circleMarker([lat, lng], {
            radius: selected ? MARKER_RADIUS_SELECTED : MARKER_RADIUS,
            color: offlinePartial ? "#6B7280" : "#ffffff",
            weight: offlinePartial ? 3 : 2.5,
            dashArray: offlinePartial ? "4 3" : undefined,
            fillColor: color,
            fillOpacity: 1,
            className: "treemap-circle-marker",
          });

          marker.bindTooltip(
            `${albero.codice} · ${albero.specie_comune} · ${albero.comune}`,
            {
              direction: "top",
              opacity: 0.95,
              className: "treemap-marker-tooltip",
            },
          );

          marker.on("click", () => {
            onSelectAlberoRef.current(
              albero,
              (marker.getElement() as HTMLElement | undefined) ?? null,
            );
          });

          marker.on("add", () => {
            const el = marker.getElement() as HTMLElement | undefined;
            if (!el) return;
            el.setAttribute("role", "button");
            el.setAttribute("tabindex", "0");
            el.setAttribute(
              "aria-label",
              `${albero.codice}, ${albero.specie_comune}, ${TM_SALUTE_LABELS[albero.stato_salute]}`,
            );
            markerElementsRef.current.set(albero.albero_id, el);
            el.addEventListener("keydown", (ev: KeyboardEvent) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelectAlberoRef.current(albero, el);
              }
            });
          });

          marker.addTo(group);

          if (albero.stato_salute === "ROSSO") {
            marker.bringToFront();
          }
        }

        if (
          !cancelled &&
          alberi.length > 0 &&
          bounds.isValid() &&
          !initialFitDoneRef.current
        ) {
          initialFitDoneRef.current = true;
          map.fitBounds(bounds, {
            padding: [48, 48],
            maxZoom: TICINO_MAP_ZOOM,
            animate: false,
          });
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [mapReady, alberi, selectedAlberoId]);

    React.useEffect(() => {
      if (!mapReady || !selectedAlberoId) return;
      const map = mapRef.current;
      const albero = alberi.find((a) => a.albero_id === selectedAlberoId);
      if (!map || !albero) return;

      const lat = Number(albero.latitude);
      const lng = Number(albero.longitude);
      map.panTo([lat, lng], { animate: true, duration: 0.35 });
      if (drawerOpen && window.innerWidth >= 768) {
        map.panBy([-160, 0], { animate: true, duration: 0.35 });
      }
    }, [mapReady, selectedAlberoId, drawerOpen, alberi]);

    React.useEffect(() => {
      if (!mapReady) return;
      mapRef.current?.invalidateSize({ pan: false, debounceMoveend: true });
    }, [mapReady, drawerOpen]);

    return (
      <div
        ref={wrapperRef}
        className="treemap-map-wrapper relative z-0 w-full min-h-[520px] h-[70vh] max-h-[640px]"
      >
        <div ref={containerRef} className="h-full w-full rounded-xl border" />
      </div>
    );
  },
);

export default TreemapMap;
