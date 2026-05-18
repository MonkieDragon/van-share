import type { GeocodePick } from "@/lib/geocodeTypes";

export function isValidGeocodePick(pick: GeocodePick | null | undefined): boolean {
  if (!pick) return false;
  if (!pick.displayName?.trim()) return false;
  return (
    Number.isFinite(pick.lat) &&
    Number.isFinite(pick.lng) &&
    pick.lat >= -90 &&
    pick.lat <= 90 &&
    pick.lng >= -180 &&
    pick.lng <= 180
  );
}
