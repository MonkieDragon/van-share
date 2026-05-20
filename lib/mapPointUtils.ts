import L from "leaflet";

/** Treat two map points as the same place (within ~30 m). */
export function sameMapPoint(
  a: [number, number],
  b: [number, number],
  toleranceM = 30,
): boolean {
  return L.latLng(a).distanceTo(L.latLng(b)) <= toleranceM;
}

export function formatDistanceMeters(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function distanceBetween(a: [number, number], b: [number, number]): number {
  return L.latLng(a).distanceTo(L.latLng(b));
}
