import type { OperatorVehicleInput } from "@/types/operator";

const MAX_IMAGES = 4;
const MIN_IMAGES = 1;

export function isAllowedVehiclePhotoUrl(s: string): boolean {
  try {
    const u = new URL(s);
    if (u.protocol === "https:") return true;
    if (process.env.NODE_ENV !== "production" && u.protocol === "http:") {
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    }
    return false;
  } catch {
    return false;
  }
}

export function parseVehicleInput(raw: unknown): OperatorVehicleInput | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  const make = typeof v.make === "string" ? v.make.trim() : "";
  const model = typeof v.model === "string" ? v.model.trim() : "";
  const license_plate = typeof v.license_plate === "string" ? v.license_plate.trim() : "";
  const year = Number(v.year);
  const urls = Array.isArray(v.image_urls) ? v.image_urls : [];
  const cleanUrls = urls
    .filter((u): u is string => typeof u === "string")
    .map((u) => u.trim())
    .filter(Boolean);

  if (!name || !make || !model || !license_plate) return null;
  if (!Number.isFinite(year) || year < 1980 || year > 2100) return null;
  if (cleanUrls.length < MIN_IMAGES || cleanUrls.length > MAX_IMAGES) return null;
  if (!cleanUrls.every(isAllowedVehiclePhotoUrl)) return null;

  const seat_count = Number(v.seat_count);
  if (!Number.isFinite(seat_count) || seat_count < 2) return null;

  return {
    name,
    make,
    model,
    year: Math.round(year),
    license_plate,
    image_urls: cleanUrls,
    seat_count: Math.round(seat_count),
  };
}

export function parseVehicleList(raw: unknown): OperatorVehicleInput[] | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const out: OperatorVehicleInput[] = [];
  for (const item of raw) {
    const v = parseVehicleInput(item);
    if (!v) return null;
    out.push(v);
  }
  return out;
}
