import type { GeocodePick } from "@/lib/geocodeTypes";
import { shouldNormalizeToPpsAirport } from "@/lib/ppsAirport";

export function isPpsAirportPickup(pick: GeocodePick | null | undefined): boolean {
  if (!pick) return false;
  return shouldNormalizeToPpsAirport(pick.displayName, pick.lat, pick.lng);
}

export function isPpsAirportJourneyPickup(journey: {
  pickup_location: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
}): boolean {
  if (journey.pickup_lat != null && journey.pickup_lng != null) {
    return shouldNormalizeToPpsAirport(
      journey.pickup_location,
      journey.pickup_lat,
      journey.pickup_lng,
    );
  }
  const name = journey.pickup_location.toLowerCase();
  return name.includes("pps") || (name.includes("puerto princesa") && name.includes("airport"));
}
