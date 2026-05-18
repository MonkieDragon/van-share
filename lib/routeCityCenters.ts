import type { EndpointId } from "@/lib/journeyRouteEndpoints";

/** Approximate city centers for preview maps (lat, lng). */
export const CITY_CENTER_LATLNG: Record<EndpointId, [number, number]> = {
  "puerto-princesa": [9.7392, 118.7353],
  "el-nido": [11.1841, 119.3954],
};

export function cityCenterForEndpoint(id: EndpointId): [number, number] {
  return CITY_CENTER_LATLNG[id];
}
