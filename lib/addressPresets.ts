import type { GeocodePick } from "@/lib/geocodeTypes";
import { PPS_ARRIVALS_PICKUP } from "@/lib/ppsAirport";
import { endpointForLeg } from "@/lib/routeAddressLabels";

export type AddressPreset = {
  id: string;
  label: string;
  pick: GeocodePick;
};

export function pickupPresetsForRoute(routeId: string | null): AddressPreset[] {
  const origin = endpointForLeg(routeId, "pickup");
  if (origin === "puerto-princesa") {
    return [{ id: "pps-airport", label: "Airport", pick: PPS_ARRIVALS_PICKUP }];
  }
  return [];
}
