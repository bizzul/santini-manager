/**
 * Client-safe config for the per-site country highlighting on the dashboard
 * map. The list of highlighted countries is stored per site in
 * `site_settings` under `map_highlight_countries` (JSONB array of ISO
 * 3166-1 alpha-3 codes, or `{ codes: [...] }`). Default: Switzerland only.
 *
 * Keep this module free of server-only imports so it can be bundled into the
 * client map component.
 */

export const MAP_HIGHLIGHT_SETTING_KEY = "map_highlight_countries";

/** Default highlight when a site has no explicit configuration. */
export const DEFAULT_HIGHLIGHT_COUNTRIES = ["CHE"];

/** World countries polygons (Natural Earth 50m, per-country borders that hug
 *  the real geography); matched via `ADM0_A3`. */
export const WORLD_COUNTRIES_GEOJSON_URL = "/geo/world-countries.geojson";

/** Sovereign countries in public/geo/world-countries.geojson (denominator for coverage). */
export const WORLD_SOVEREIGN_COUNTRIES_COUNT = 177;

export const HIGHLIGHT_BORDER_COLOR = "#38bdf8";
export const HIGHLIGHT_FILL_COLOR = "#38bdf8";
export const HIGHLIGHT_FILL_OPACITY = 0.28;

/**
 * Fallback centroids [lng, lat] for highlight countries missing from the
 * bundled dataset (e.g. tiny city-states such as Singapore), rendered as a
 * small dot so they still appear highlighted.
 */
export const HIGHLIGHT_FALLBACK_CENTROIDS: Record<string, [number, number]> = {
  SGP: [103.82, 1.35],
};

/**
 * Normalizes a persisted `site_settings.setting_value` into a list of ISO
 * alpha-3 codes. Accepts a raw array (`["CHE","FRA"]`) or an object
 * (`{ codes: [...] }`); falls back to the default on any other shape.
 */
export function parseHighlightCountries(value: unknown): string[] {
  const fromArray = (arr: unknown[]): string[] =>
    arr
      .filter((v): v is string => typeof v === "string" && v.trim().length === 3)
      .map((c) => c.trim().toUpperCase());

  if (Array.isArray(value)) {
    const codes = fromArray(value);
    return codes.length ? codes : [...DEFAULT_HIGHLIGHT_COUNTRIES];
  }

  if (value && typeof value === "object") {
    const codes = (value as { codes?: unknown }).codes;
    if (Array.isArray(codes)) {
      const parsed = fromArray(codes);
      if (parsed.length) return parsed;
    }
  }

  return [...DEFAULT_HIGHLIGHT_COUNTRIES];
}
