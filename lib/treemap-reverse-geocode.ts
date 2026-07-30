"use client";

const REQUEST_SPACING_MS = 350;
let reverseQueue: Promise<unknown> = Promise.resolve();

export interface ReverseGeocodeResult {
  comune: string | null;
  indirizzo: string | null;
  npa: string | null;
}

async function queuedReverseRequest(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  reverseQueue = reverseQueue.then(
    () =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, REQUEST_SPACING_MS);
      }),
  );
  await reverseQueue;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "14",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
      road?: string;
      house_number?: string;
      postcode?: string;
    };
  };

  const addr = payload.address;
  if (!addr) return null;

  const comune =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.county ??
    null;

  const street = [addr.road, addr.house_number].filter(Boolean).join(" ");

  return {
    comune,
    indirizzo: street || null,
    npa: addr.postcode ?? null,
  };
}

export async function reverseGeocodeTicino(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  try {
    return await queuedReverseRequest(lat, lng);
  } catch {
    return null;
  }
}
