import type { GeocodePick } from "@/lib/geocodeTypes";
import type { EndpointId } from "@/lib/journeyRouteEndpoints";

/** Van pick-up at PPS arrivals (roadside), not airfield centroid. */
export const PPS_ARRIVALS_PICKUP: GeocodePick = {
  displayName: "Puerto Princesa Airport (PPS) – arrivals pick-up",
  lat: 9.746151,
  lng: 118.750538,
};

const SNAP_RADIUS_M = 2000;

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isPpsAirportSearchQuery(q: string): boolean {
  const n = q.toLowerCase().replace(/\s+/g, " ").trim();
  if (!n) return false;
  if (/\bpps\b/.test(n)) return true;
  if (/puerto\s*princesa/.test(n) && /\bairport\b/.test(n)) return true;
  if (/\bairport\b/.test(n) && /\bprincesa\b/.test(n)) return true;
  if (/palawan\s+international/.test(n)) return true;
  return false;
}

function isPpsAirportResultName(displayName: string): boolean {
  const d = displayName.toLowerCase();
  if (d.includes("puerto princesa") && d.includes("airport")) return true;
  if (/\bpps\b/.test(d) && d.includes("airport")) return true;
  if (d.includes("palawan international airport")) return true;
  return false;
}

export function isNearPpsAirport(lat: number, lng: number): boolean {
  return distanceMeters(lat, lng, PPS_ARRIVALS_PICKUP.lat, PPS_ARRIVALS_PICKUP.lng) <= SNAP_RADIUS_M;
}

export function shouldNormalizeToPpsAirport(
  displayName: string,
  lat: number,
  lng: number,
): boolean {
  return isPpsAirportResultName(displayName) || isNearPpsAirport(lat, lng);
}

export type GeocodeSuggestionRow = {
  display_name: string;
  lat: string;
  lon: string;
};

function canonicalRow(): GeocodeSuggestionRow {
  return {
    display_name: PPS_ARRIVALS_PICKUP.displayName,
    lat: String(PPS_ARRIVALS_PICKUP.lat),
    lon: String(PPS_ARRIVALS_PICKUP.lng),
  };
}

/** Snap PPS airport searches and results to the arrivals pick-up point. */
export function normalizePpsAirportSuggestions(
  q: string,
  rows: GeocodeSuggestionRow[],
  endpoint: EndpointId | null,
): GeocodeSuggestionRow[] {
  if (endpoint !== "puerto-princesa") return rows;

  const snapped = rows.map((r) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return r;
    if (!shouldNormalizeToPpsAirport(r.display_name, lat, lon)) return r;
    return canonicalRow();
  });

  if (isPpsAirportSearchQuery(q)) {
    const c = canonicalRow();
    const cKey = `${c.lat},${c.lon}`;
    const withoutDup = snapped.filter((r) => `${r.lat},${r.lon}` !== cKey);
    return [c, ...withoutDup];
  }

  const seen = new Set<string>();
  const out: GeocodeSuggestionRow[] = [];
  for (const r of snapped) {
    const key = `${r.lat},${r.lon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Map stored journey coordinates to van pick-up when they refer to PPS airport. */
export function vanPickupCoordinates(
  displayName: string,
  lat: number,
  lng: number,
): [number, number] {
  if (shouldNormalizeToPpsAirport(displayName, lat, lng)) {
    return [PPS_ARRIVALS_PICKUP.lat, PPS_ARRIVALS_PICKUP.lng];
  }
  return [lat, lng];
}
