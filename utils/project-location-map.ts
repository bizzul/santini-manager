"use client";

import type { DashboardProjectLocation } from "@/lib/server-data";

export interface GeoPoint {
  lat: number;
  lng: number;
  source: "existing" | "geocoded";
}

export interface NormalizedProjectLocation extends DashboardProjectLocation {
  fullAddress: string | null;
  coordinates: GeoPoint | null;
}

const GEOCODE_STORAGE_PREFIX = "dashboard:project-geocode";
const REQUEST_SPACING_MS = 350;
const geocodeResultMemoryCache = new Map<string, GeoPoint | null>();
const geocodeInFlightRequests = new Map<string, Promise<GeoPoint | null>>();
let geocodeQueue: Promise<unknown> = Promise.resolve();

function getAddressCacheKey(address: string, cacheNamespace: string): string {
  const normalizedAddress = address.trim().toLowerCase();
  return `${GEOCODE_STORAGE_PREFIX}:${cacheNamespace}:${normalizedAddress}`;
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readFromLocalCache(cacheKey: string): GeoPoint | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { lat?: number; lng?: number } | null;
    if (!parsed) return null;

    if (!isValidCoordinate(parsed.lat) || !isValidCoordinate(parsed.lng)) {
      return null;
    }

    return { lat: parsed.lat, lng: parsed.lng, source: "geocoded" };
  } catch {
    return null;
  }
}

function writeToLocalCache(cacheKey: string, point: GeoPoint | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!point) {
      window.localStorage.removeItem(cacheKey);
      return;
    }
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({ lat: point.lat, lng: point.lng }),
    );
  } catch {
    // Ignore storage quota / access errors.
  }
}

async function queuedGeocodeRequest(address: string): Promise<GeoPoint | null> {
  geocodeQueue = geocodeQueue.then(
    async () =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, REQUEST_SPACING_MS);
      }),
  );
  await geocodeQueue;

  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
  );

  if (response.status === 429) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[Map] Nominatim rate limited for address", address);
    }
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
  }>;
  const first = payload[0];
  const lat = first?.lat ? Number(first.lat) : Number.NaN;
  const lng = first?.lon ? Number(first.lon) : Number.NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng, source: "geocoded" };
}

export function buildProjectAddress(project: DashboardProjectLocation): string | null {
  const parts = [
    project.addressLine?.trim() || "",
    project.city?.trim() || "",
    project.zipCode ? String(project.zipCode) : "",
    project.countryCode?.trim() || "",
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(", ");
}

export async function geocodeAddress(
  address: string,
  cacheNamespace: string,
): Promise<GeoPoint | null> {
  const cacheKey = getAddressCacheKey(address, cacheNamespace);

  if (geocodeResultMemoryCache.has(cacheKey)) {
    return geocodeResultMemoryCache.get(cacheKey) || null;
  }

  const localCache = readFromLocalCache(cacheKey);
  if (localCache) {
    geocodeResultMemoryCache.set(cacheKey, localCache);
    return localCache;
  }

  if (geocodeInFlightRequests.has(cacheKey)) {
    return geocodeInFlightRequests.get(cacheKey) || null;
  }

  const geocodePromise = queuedGeocodeRequest(address)
    .then((result) => {
      geocodeResultMemoryCache.set(cacheKey, result);
      if (result) {
        writeToLocalCache(cacheKey, result);
      }
      return result;
    })
    .catch(() => {
      geocodeResultMemoryCache.set(cacheKey, null);
      return null;
    })
    .finally(() => {
      geocodeInFlightRequests.delete(cacheKey);
    });

  geocodeInFlightRequests.set(cacheKey, geocodePromise);
  return geocodePromise;
}

export function normalizeProjectLocation(
  project: DashboardProjectLocation,
  fullAddress: string | null,
  geocodedPoint: GeoPoint | null,
): NormalizedProjectLocation {
  const latitude = project.latitude;
  const longitude = project.longitude;
  const hasExistingCoordinates = isValidCoordinate(latitude) && isValidCoordinate(longitude);

  if (hasExistingCoordinates) {
    return {
      ...project,
      fullAddress,
      coordinates: {
        lat: latitude,
        lng: longitude,
        source: "existing",
      },
    };
  }

  return {
    ...project,
    fullAddress,
    coordinates: geocodedPoint,
  };
}
