import { NextRequest, NextResponse } from "next/server";
import { viewboxForEndpoint, viewboxForRoute } from "@/lib/geocodeBounds";
import type { EndpointId } from "@/lib/journeyRouteEndpoints";
import { normalizePpsAirportSuggestions } from "@/lib/ppsAirport";
import { endpointForLeg, type AddressLeg } from "@/lib/routeAddressLabels";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "VanShare/1.0 (private van coordination; contact: support@vanshare.local)";

const lastByIp = new Map<string, number>();
const MIN_INTERVAL_MS = 400;

type NominatimRow = {
  display_name: string;
  lat: string;
  lon: string;
};

async function nominatimSearch(
  q: string,
  viewbox: string | null,
  bounded: boolean,
): Promise<NominatimRow[]> {
  const params = new URLSearchParams({
    format: "json",
    q,
    countrycodes: "ph",
    limit: "10",
    addressdetails: "1",
  });
  if (viewbox) {
    params.set("viewbox", viewbox);
    if (bounded) params.set("bounded", "1");
  }

  const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as NominatimRow[]) : [];
}

function dedupeRows(rows: NominatimRow[]): NominatimRow[] {
  const seen = new Set<string>();
  const out: NominatimRow[] = [];
  for (const r of rows) {
    const key = `${r.lat},${r.lon}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const routeId = req.nextUrl.searchParams.get("route_id")?.trim() ?? "";
  const leg = req.nextUrl.searchParams.get("leg")?.trim() as AddressLeg | "";
  const endpointParam = req.nextUrl.searchParams.get("endpoint")?.trim() as EndpointId | "";

  if (q.length < 3) {
    return NextResponse.json([]);
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const now = Date.now();
  const last = lastByIp.get(ip) ?? 0;
  if (now - last < MIN_INTERVAL_MS) {
    return NextResponse.json([], {
      status: 429,
      headers: { "Retry-After": "1" },
    });
  }
  lastByIp.set(ip, now);

  const endpoint =
    endpointParam === "puerto-princesa" || endpointParam === "el-nido"
      ? endpointParam
      : leg === "pickup" || leg === "dropoff"
        ? endpointForLeg(routeId || null, leg)
        : null;

  const localViewbox = endpoint ? viewboxForEndpoint(endpoint) : viewboxForRoute(routeId || null);

  try {
    // Prefer local area (bias only — not strict bounded)
    let rows = localViewbox ? await nominatimSearch(q, localViewbox, false) : [];
    // Strict local pass if we still have nothing
    if (rows.length === 0 && localViewbox) {
      rows = await nominatimSearch(q, localViewbox, true);
    }
    // Nationwide fallback (still PH)
    if (rows.length < 3) {
      const wide = await nominatimSearch(q, null, false);
      rows = dedupeRows([...rows, ...wide]);
    }
    const normalized = normalizePpsAirportSuggestions(q, dedupeRows(rows), endpoint);
    return NextResponse.json(normalized.slice(0, 10));
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
