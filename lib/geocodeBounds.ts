import type { EndpointId } from "@/lib/journeyRouteEndpoints";
import { CITY_CENTER_LATLNG } from "@/lib/routeCityCenters";

export const routeBounds: Record<string, string> = {
  "el-nido-puerto-princesa": "119.20,11.00,119.60,10.10",
  "puerto-princesa-el-nido": "118.50,9.50,119.20,10.20",
};

export function expandBounds(bounds: string, margin = 0.3) {
  const [minLon, maxLat, maxLon, minLat] = bounds.split(",").map(Number);
  return [minLon - margin, maxLat + margin, maxLon + margin, minLat - margin].join(",");
}

/** Viewbox biased to one city (not strict — no bounded=1). */
export function viewboxForEndpoint(endpoint: EndpointId | null | undefined): string {
  if (!endpoint) return "";
  const [lat, lng] = CITY_CENTER_LATLNG[endpoint];
  const dLat = 0.45;
  const dLon = 0.55;
  const minLon = lng - dLon;
  const maxLon = lng + dLon;
  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  return `${minLon},${maxLat},${maxLon},${minLat}`;
}

export function viewboxForRoute(routeId: string | null | undefined): string {
  const raw = routeId && routeBounds[routeId] ? routeBounds[routeId] : "";
  return raw ? expandBounds(raw) : "";
}
