"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedProjectLocation } from "@/utils/project-location-map";
import {
  DEFAULT_HIGHLIGHT_COUNTRIES,
  HIGHLIGHT_BORDER_COLOR,
  HIGHLIGHT_FALLBACK_CENTROIDS,
  HIGHLIGHT_FILL_COLOR,
  HIGHLIGHT_FILL_OPACITY,
  WORLD_COUNTRIES_GEOJSON_URL,
} from "@/lib/map-highlight";
import { COUNTRY_CAPITALS, type SelectedCountry } from "@/lib/map-capitals";
import { useLocale } from "@/components/i18n/i18n-provider";

/** OpenStreetMap standard tile layer (usage policy: https://operations.osmfoundation.org/policies/tiles/) */
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type CountryProperties = {
  ADM0_A3?: string;
  ISO_A3?: string;
  ISO_A3_EH?: string;
  ISO_A2?: string;
  [key: string]: unknown;
};

/** Localized country name from Natural Earth props (NAME_DE, NAME_IT, ...). */
function featureLocalizedName(
  props: CountryProperties,
  locale: string,
): string | null {
  const keys = [`NAME_${locale.toUpperCase()}`, "NAME_EN", "NAME"];
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

type CountryFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: CountryProperties;
    geometry: unknown;
  }>;
};

/** Codice ISO alpha-3 robusto (in Natural Earth Francia/Norvegia hanno
 *  ISO_A3 = "-99", ma ADM0_A3 e sempre valorizzato). */
function featureIso(props: CountryProperties): string | null {
  const candidates = [props.ADM0_A3, props.ISO_A3_EH, props.ISO_A3];
  for (const c of candidates) {
    if (typeof c === "string" && c.length === 3 && c !== "-99") {
      return c.toUpperCase();
    }
  }
  return null;
}

interface ActiveProjectsMapProps {
  projects: NormalizedProjectLocation[];
  domain: string;
  doubleClickZoom?: boolean;
  onDoubleClick?: () => void;
  /** ISO alpha-3 codes of the countries to highlight (default: Switzerland). */
  highlightCountries?: string[];
  /** Called when a capital "Dashboard point" is clicked. */
  onCountrySelect?: (country: SelectedCountry) => void;
  /**
   * When provided, every country on the map becomes clickable (transparent
   * interactive layer) and this is called with the clicked country.
   */
  onCountryClick?: (country: SelectedCountry) => void;
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

export default function ActiveProjectsMap({
  projects,
  domain,
  doubleClickZoom = true,
  onDoubleClick,
  highlightCountries = DEFAULT_HIGHLIGHT_COUNTRIES,
  onCountrySelect,
  onCountryClick,
}: ActiveProjectsMapProps) {
  const locale = useLocale();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const highlightLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const capitalsLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const clickableLayerRef = useRef<import("leaflet").GeoJSON | null>(null);
  const highlightBoundsRef = useRef<import("leaflet").LatLngBounds | null>(null);
  const hoverTooltipRef = useRef<import("leaflet").Tooltip | null>(null);
  const pointsRef = useRef<[number, number][]>([]);
  const onCountrySelectRef = useRef(onCountrySelect);
  const onCountryClickRef = useRef(onCountryClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onCountrySelectRef.current = onCountrySelect;
  }, [onCountrySelect]);

  useEffect(() => {
    onCountryClickRef.current = onCountryClick;
  }, [onCountryClick]);

  // Stable primitive so the highlight effect only re-runs on real changes.
  const highlightKey = useMemo(
    () => [...highlightCountries].map((c) => c.toUpperCase()).sort().join(","),
    [highlightCountries],
  );

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

    pointsRef.current = points;

    const highlightBounds = highlightBoundsRef.current;
    if (highlightBounds && highlightBounds.isValid()) {
      // Fit to the highlighted countries (worldwide for multi-country sites),
      // extended with any project markers so they stay in view.
      const bounds = L.latLngBounds(
        highlightBounds.getSouthWest(),
        highlightBounds.getNorthEast(),
      );
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12, animate: false });
    } else if (points.length > 0) {
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
        doubleClickZoom,
        boxZoom: true,
        zoomControl: true,
        touchZoom: true,
      });

      L.tileLayer(OSM_TILE_URL, {
        attribution: OSM_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Layer per l'evidenziazione delle nazioni: popolato da un effetto
      // dedicato in base a `highlightCountries`. Aggiunto prima del layer dei
      // marker così i pin restano cliccabili sopra.
      highlightLayerRef.current = L.layerGroup().addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);

      // Capital "Dashboard points" sit on top so they stay clickable.
      capitalsLayerRef.current = L.layerGroup().addTo(map);

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
        highlightLayerRef.current = null;
        capitalsLayerRef.current = null;
        clickableLayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    void applyMarkers();
  }, [applyMarkers, mapReady]);

  // Draw the highlighted countries (fill + border) and fit the view to them.
  useEffect(() => {
    if (!mapReady) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const map = mapRef.current;
      const layer = highlightLayerRef.current;
      if (!map || !layer) return;

      const L = await import("leaflet");
      const codes = new Set(highlightCountries.map((c) => c.toUpperCase()));

      layer.clearLayers();
      capitalsLayerRef.current?.clearLayers();
      highlightBoundsRef.current = null;

      try {
        const res = await fetch(WORLD_COUNTRIES_GEOJSON_URL);
        if (!res.ok || cancelled || !highlightLayerRef.current) return;
        const fc = (await res.json()) as CountryFeatureCollection;
        if (cancelled || !highlightLayerRef.current) return;

        const matched = fc.features.filter((f) => {
          const iso = featureIso(f.properties);
          return iso ? codes.has(iso) : false;
        });

        // Feature per ISO3 per ricavare nome localizzato + ISO2 delle capitali.
        const featureByIso = new Map<string, CountryFeatureCollection["features"][number]>();
        matched.forEach((f) => {
          const iso = featureIso(f.properties);
          if (iso) featureByIso.set(iso, f);
        });

        const bounds = L.latLngBounds([]);

        if (matched.length > 0) {
          const gj = L.geoJSON(
            { type: "FeatureCollection", features: matched } as unknown as import("geojson").FeatureCollection,
            {
              style: {
                color: HIGHLIGHT_BORDER_COLOR,
                weight: 1.5,
                opacity: 0.9,
                fillColor: HIGHLIGHT_FILL_COLOR,
                fillOpacity: HIGHLIGHT_FILL_OPACITY,
                interactive: false,
              },
            },
          );
          gj.addTo(highlightLayerRef.current);
          const gjBounds = gj.getBounds();
          if (gjBounds.isValid()) bounds.extend(gjBounds);
        }

        // Fallback: nazioni assenti dal dataset 110m (es. Singapore) come dot.
        const foundIso = new Set(
          matched
            .map((f) => featureIso(f.properties))
            .filter((v): v is string => Boolean(v)),
        );
        codes.forEach((code) => {
          if (foundIso.has(code)) return;
          const centroid = HIGHLIGHT_FALLBACK_CENTROIDS[code];
          if (!centroid || !highlightLayerRef.current) return;
          const [lng, lat] = centroid;
          L.circleMarker([lat, lng], {
            radius: 6,
            color: HIGHLIGHT_BORDER_COLOR,
            weight: 1.5,
            opacity: 0.9,
            fillColor: HIGHLIGHT_FILL_COLOR,
            fillOpacity: Math.min(1, HIGHLIGHT_FILL_OPACITY + 0.3),
            interactive: false,
          }).addTo(highlightLayerRef.current);
          bounds.extend([lat, lng]);
        });

        // "Dashboard point" cliccabile sulla capitale di ogni paese evidenziato.
        const capitalsLayer = capitalsLayerRef.current;
        if (capitalsLayer) {
          codes.forEach((iso3) => {
            const cap = COUNTRY_CAPITALS[iso3];
            if (!cap) return;
            const feature = featureByIso.get(iso3);
            const name =
              (feature && featureLocalizedName(feature.properties, locale)) ||
              cap.name;
            const iso2Raw = feature?.properties.ISO_A2;
            const iso2 =
              typeof iso2Raw === "string" && iso2Raw.length === 2
                ? iso2Raw.toUpperCase()
                : cap.iso2;

            // Country flag as the clickable "Dashboard point".
            const icon = L.divIcon({
              className: "dashboard-map-capital",
              html: `
                <span style="display:block;width:34px;height:23px;border-radius:4px;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.45);overflow:hidden;cursor:pointer;background:${HIGHLIGHT_BORDER_COLOR};">
                  <img src="https://flagcdn.com/w40/${iso2.toLowerCase()}.png" alt="${name}" style="display:block;width:100%;height:100%;object-fit:cover;" />
                </span>
              `,
              iconSize: [34, 23],
              iconAnchor: [17, 12],
            });

            const marker = L.marker([cap.lat, cap.lng], { icon, title: name });
            marker.bindTooltip(name, { direction: "top", offset: [0, -12] });
            marker.on("click", () => {
              onCountrySelectRef.current?.({
                iso3,
                iso2,
                name,
                capital: cap.capital,
              });
            });
            marker.addTo(capitalsLayer);
            bounds.extend([cap.lat, cap.lng]);
          });
        }

        highlightBoundsRef.current = bounds.isValid() ? bounds : null;

        // Riadatta la vista alle nazioni evidenziate + eventuali marker.
        if (highlightBoundsRef.current) {
          const view = L.latLngBounds(
            highlightBoundsRef.current.getSouthWest(),
            highlightBoundsRef.current.getNorthEast(),
          );
          pointsRef.current.forEach((p) => view.extend(p));
          map.fitBounds(view, { padding: [24, 24], maxZoom: 12, animate: false });
        }
      } catch {
        // Dataset non disponibile: la mappa resta utilizzabile senza evidenziazione.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, highlightKey, locale]);

  // Transparent, fully-interactive world layer so ANY country is clickable.
  // Only mounted when `onCountryClick` is provided (dashboard map).
  useEffect(() => {
    if (!mapReady || !onCountryClick) return;
    let cancelled = false;

    void (async () => {
      const map = mapRef.current;
      if (!map) return;
      const L = await import("leaflet");

      try {
        const res = await fetch(WORLD_COUNTRIES_GEOJSON_URL);
        if (!res.ok || cancelled) return;
        const fc = (await res.json()) as CountryFeatureCollection;
        if (cancelled || !mapRef.current) return;

        clickableLayerRef.current?.remove();
        const layer = L.geoJSON(
          fc as unknown as import("geojson").FeatureCollection,
          {
            style: {
              // Invisible but still captures clicks over the country area.
              color: "#000000",
              weight: 0,
              opacity: 0,
              fillColor: "#000000",
              fillOpacity: 0,
              interactive: true,
            },
            onEachFeature: (feature, lyr) => {
              lyr.on("mouseover", () => {
                (lyr as import("leaflet").Path).setStyle?.({
                  fillOpacity: 0.12,
                  fillColor: HIGHLIGHT_BORDER_COLOR,
                });
              });
              lyr.on("mouseout", () => {
                (lyr as import("leaflet").Path).setStyle?.({ fillOpacity: 0 });
              });
              lyr.on("click", () => {
                const props = feature.properties as CountryProperties;
                const iso3 = featureIso(props);
                if (!iso3) return;
                const cap = COUNTRY_CAPITALS[iso3];
                const iso2Raw = props.ISO_A2;
                const iso2 =
                  typeof iso2Raw === "string" && iso2Raw.length === 2
                    ? iso2Raw.toUpperCase()
                    : cap?.iso2 ?? "";
                const name =
                  featureLocalizedName(props, locale) || cap?.name || iso3;
                onCountryClickRef.current?.({
                  iso3,
                  iso2,
                  name,
                  capital: cap?.capital ?? "",
                });
              });
            },
          },
        );
        layer.addTo(map);
        clickableLayerRef.current = layer;
      } catch {
        // World dataset unavailable: map stays usable, just not clickable.
      }
    })();

    return () => {
      cancelled = true;
      clickableLayerRef.current?.remove();
      clickableLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, Boolean(onCountryClick), locale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }

    if (doubleClickZoom) {
      map.doubleClickZoom.enable();
    } else {
      map.doubleClickZoom.disable();
    }
  }, [doubleClickZoom, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !onDoubleClick) {
      return;
    }

    map.on("dblclick", onDoubleClick);
    return () => {
      map.off("dblclick", onDoubleClick);
    };
  }, [mapReady, onDoubleClick]);

  return (
    <div className="absolute inset-0 z-[2] min-h-[200px]">
      {/* Sottile fallback OSM: se i tile Leaflet non caricano, resta comunque un riferimento geografico */}
      <iframe
        title="OpenStreetMap (fallback)"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full border-0 opacity-25"
        src="https://www.openstreetmap.org/export/embed.html?bbox=-170,-55,190,75&layer=mapnik"
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
