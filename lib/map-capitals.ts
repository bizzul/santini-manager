/**
 * Capital cities (coordinates + ISO alpha-2) for the countries that can be
 * highlighted on the dashboard map. Used to place a clickable "Dashboard
 * point" exactly on each country's capital.
 *
 * Keyed by ISO 3166-1 alpha-3 (same codes used for `map_highlight_countries`).
 * Client-safe: no server-only imports.
 */

export interface CapitalInfo {
  /** Capital city display name. */
  capital: string;
  /** ISO 3166-1 alpha-2 code (matches `Client.countryCode`). */
  iso2: string;
  /** Fallback country name (used if a localized name is unavailable). */
  name: string;
  /** International dialing code (e.g. "+41"). */
  phoneCode: string;
  /** Approximate population (absolute). */
  population: number;
  lat: number;
  lng: number;
}

export const COUNTRY_CAPITALS: Record<string, CapitalInfo> = {
  CHE: { capital: "Bern", iso2: "CH", name: "Switzerland", phoneCode: "+41", population: 8850000, lat: 46.9481, lng: 7.4474 },
  FRA: { capital: "Paris", iso2: "FR", name: "France", phoneCode: "+33", population: 68000000, lat: 48.8566, lng: 2.3522 },
  USA: { capital: "Washington, D.C.", iso2: "US", name: "United States", phoneCode: "+1", population: 334000000, lat: 38.9072, lng: -77.0369 },
  CAN: { capital: "Ottawa", iso2: "CA", name: "Canada", phoneCode: "+1", population: 40000000, lat: 45.4215, lng: -75.6972 },
  BEL: { capital: "Brussels", iso2: "BE", name: "Belgium", phoneCode: "+32", population: 11700000, lat: 50.8503, lng: 4.3517 },
  NLD: { capital: "Amsterdam", iso2: "NL", name: "Netherlands", phoneCode: "+31", population: 17900000, lat: 52.3676, lng: 4.9041 },
  CHN: { capital: "Beijing", iso2: "CN", name: "China", phoneCode: "+86", population: 1412000000, lat: 39.9042, lng: 116.4074 },
  FIN: { capital: "Helsinki", iso2: "FI", name: "Finland", phoneCode: "+358", population: 5600000, lat: 60.1699, lng: 24.9384 },
  GBR: { capital: "London", iso2: "GB", name: "United Kingdom", phoneCode: "+44", population: 67700000, lat: 51.5074, lng: -0.1278 },
  IRL: { capital: "Dublin", iso2: "IE", name: "Ireland", phoneCode: "+353", population: 5100000, lat: 53.3498, lng: -6.2603 },
  HUN: { capital: "Budapest", iso2: "HU", name: "Hungary", phoneCode: "+36", population: 9600000, lat: 47.4979, lng: 19.0402 },
  IND: { capital: "New Delhi", iso2: "IN", name: "India", phoneCode: "+91", population: 1428000000, lat: 28.6139, lng: 77.209 },
  IDN: { capital: "Jakarta", iso2: "ID", name: "Indonesia", phoneCode: "+62", population: 277000000, lat: -6.2088, lng: 106.8456 },
  ISR: { capital: "Jerusalem", iso2: "IL", name: "Israel", phoneCode: "+972", population: 9700000, lat: 31.7683, lng: 35.2137 },
  ITA: { capital: "Rome", iso2: "IT", name: "Italy", phoneCode: "+39", population: 58900000, lat: 41.9028, lng: 12.4964 },
  JOR: { capital: "Amman", iso2: "JO", name: "Jordan", phoneCode: "+962", population: 11300000, lat: 31.9454, lng: 35.9284 },
  MYS: { capital: "Kuala Lumpur", iso2: "MY", name: "Malaysia", phoneCode: "+60", population: 34300000, lat: 3.139, lng: 101.6869 },
  NOR: { capital: "Oslo", iso2: "NO", name: "Norway", phoneCode: "+47", population: 5500000, lat: 59.9139, lng: 10.7522 },
  POL: { capital: "Warsaw", iso2: "PL", name: "Poland", phoneCode: "+48", population: 36800000, lat: 52.2297, lng: 21.0122 },
  QAT: { capital: "Doha", iso2: "QA", name: "Qatar", phoneCode: "+974", population: 2700000, lat: 25.2854, lng: 51.531 },
  SGP: { capital: "Singapore", iso2: "SG", name: "Singapore", phoneCode: "+65", population: 5900000, lat: 1.3521, lng: 103.8198 },
  KOR: { capital: "Seoul", iso2: "KR", name: "South Korea", phoneCode: "+82", population: 51700000, lat: 37.5665, lng: 126.978 },
  ESP: { capital: "Madrid", iso2: "ES", name: "Spain", phoneCode: "+34", population: 48400000, lat: 40.4168, lng: -3.7038 },
  SWE: { capital: "Stockholm", iso2: "SE", name: "Sweden", phoneCode: "+46", population: 10500000, lat: 59.3293, lng: 18.0686 },
  THA: { capital: "Bangkok", iso2: "TH", name: "Thailand", phoneCode: "+66", population: 71800000, lat: 13.7563, lng: 100.5018 },
  TUR: { capital: "Ankara", iso2: "TR", name: "Turkey", phoneCode: "+90", population: 85300000, lat: 39.9334, lng: 32.8597 },
};

export interface CountryDashboardStats {
  clients: number;
  projects: number;
  offers: number;
  totalValue: number;
  /** Sum of sellPrice for OFFERTA tasks. */
  offerValue: number;
  /** Sum of sellPrice for LAVORO tasks. */
  orderValue: number;
}

/** Country selected on the map (payload for the dashboard modal). */
export interface SelectedCountry {
  iso3: string;
  iso2: string;
  name: string;
  capital: string;
}
