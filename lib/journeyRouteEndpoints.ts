export const JOURNEY_LOCATIONS = {
  pp: { id: "puerto-princesa", label: "Puerto Princesa" },
  en: { id: "el-nido", label: "El Nido" },
} as const;

export type EndpointId = (typeof JOURNEY_LOCATIONS.pp)["id"] | (typeof JOURNEY_LOCATIONS.en)["id"];

export function routeIdFromEndpoints(origin: string, dest: string): string | null {
  if (!origin || !dest || origin === dest) return null;
  if (origin === JOURNEY_LOCATIONS.pp.id && dest === JOURNEY_LOCATIONS.en.id) {
    return "puerto-princesa-el-nido";
  }
  if (origin === JOURNEY_LOCATIONS.en.id && dest === JOURNEY_LOCATIONS.pp.id) {
    return "el-nido-puerto-princesa";
  }
  return null;
}

export function endpointsFromRouteId(
  routeId: string | null,
): { origin: EndpointId; dest: EndpointId } | null {
  if (routeId === "puerto-princesa-el-nido") {
    return { origin: JOURNEY_LOCATIONS.pp.id, dest: JOURNEY_LOCATIONS.en.id };
  }
  if (routeId === "el-nido-puerto-princesa") {
    return { origin: JOURNEY_LOCATIONS.en.id, dest: JOURNEY_LOCATIONS.pp.id };
  }
  return null;
}

export function tomorrowLocalYmd() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymdFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysYmd(ymd: string, deltaDays: number): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  d.setDate(d.getDate() + deltaDays);
  return ymdFromDate(d);
}
