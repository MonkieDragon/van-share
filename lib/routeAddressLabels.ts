import {
  endpointsFromRouteId,
  JOURNEY_LOCATIONS,
  type EndpointId,
} from "@/lib/journeyRouteEndpoints";

export type AddressLeg = "pickup" | "dropoff";

export function endpointForLeg(routeId: string | null, leg: AddressLeg): EndpointId | null {
  const ends = endpointsFromRouteId(routeId);
  if (!ends) return null;
  return leg === "pickup" ? ends.origin : ends.dest;
}

export function addressLabelForLeg(routeId: string | null, leg: AddressLeg): string {
  const endpoint = endpointForLeg(routeId, leg);
  if (!endpoint) {
    return leg === "pickup" ? "Pickup address" : "Dropoff address";
  }
  const place =
    endpoint === JOURNEY_LOCATIONS.pp.id
      ? JOURNEY_LOCATIONS.pp.label
      : JOURNEY_LOCATIONS.en.label;
  return leg === "pickup" ? `Pickup address - ${place}` : `Dropoff address - ${place}`;
}
