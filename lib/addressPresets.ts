import type { GeocodePick } from "@/lib/geocodeTypes";
import { PPS_ARRIVALS_PICKUP } from "@/lib/ppsAirport";
import { endpointForLeg, type AddressLeg } from "@/lib/routeAddressLabels";

export type AddressPreset = {
  id: string;
  label: string;
  pick: GeocodePick;
};

/** Van drop-off / pick-up at El Nido bus terminal. */
export const EN_BUS_TERMINAL: GeocodePick = {
  displayName: "El Nido Bus Terminal",
  lat: 11.178,
  lng: 119.395,
};

export function defaultPickForLeg(routeId: string | null, leg: AddressLeg): GeocodePick | null {
  const endpoint = endpointForLeg(routeId, leg);
  if (endpoint === "puerto-princesa") return PPS_ARRIVALS_PICKUP;
  if (endpoint === "el-nido") return EN_BUS_TERMINAL;
  return null;
}

export function pickupPresetsForRoute(routeId: string | null): AddressPreset[] {
  const pick = defaultPickForLeg(routeId, "pickup");
  if (!pick) return [];
  const id = pick === PPS_ARRIVALS_PICKUP ? "pps-airport" : "en-bus-terminal";
  const label = pick === PPS_ARRIVALS_PICKUP ? "Airport" : "Bus terminal";
  return [{ id, label, pick }];
}
