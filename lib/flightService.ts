import type {
  FlightOption,
  FlightSearchResult,
  FlightStatus,
  FlightStatusLabel,
  FlightStatusResult,
} from "@/lib/flightTypes";

const PPS_IATA = "PPS";
const CACHE_TTL_MS = 10 * 60 * 1000;
const DELAY_THRESHOLD_MIN = 15;

type CacheEntry<T> = { expires: number; data: T };

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, data });
}

function invalidateCache(key: string): void {
  cache.delete(key);
}

type FlightProvider = {
  fetchPpsArrivals(date: string): Promise<FlightOption[] | null>;
  fetchFlightStatus(flightNumber: string, date: string): Promise<FlightStatus | null>;
};

type AviationStackFlight = {
  flight_status?: string;
  departure?: {
    iata?: string;
    scheduled?: string;
    estimated?: string;
  };
  arrival?: {
    iata?: string;
    scheduled?: string;
    estimated?: string;
  };
  airline?: { name?: string; iata?: string };
  flight?: { iata?: string; number?: string };
};

function apiKey(): string | null {
  return process.env.AVIATIONSTACK_ACCESS_KEY?.trim() || null;
}

function normalizeFlightNumber(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function parseIso(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local calendar date (PH) for matching journey departure_date to arrival times. */
function arrivalLocalYmd(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = parseIso(iso);
  if (!d) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function rowMatchesDate(row: AviationStackFlight, date: string): boolean {
  const ymd = arrivalLocalYmd(row.arrival?.scheduled);
  return ymd === date;
}

function mapToOption(row: AviationStackFlight): FlightOption | null {
  const flightNumber = row.flight?.iata?.trim();
  const arrivalIata = row.arrival?.iata?.trim();
  const scheduled = row.arrival?.scheduled;
  if (!flightNumber || !scheduled) return null;
  if (arrivalIata && arrivalIata !== PPS_IATA) return null;

  return {
    flightNumber: normalizeFlightNumber(flightNumber),
    airline: row.airline?.name?.trim() || row.airline?.iata?.trim() || "Unknown airline",
    originIata: row.departure?.iata?.trim() || "???",
    destinationIata: arrivalIata || PPS_IATA,
    scheduledArrival: scheduled,
  };
}

function statusLabelFromRow(
  row: AviationStackFlight,
  scheduledIso: string | null,
  estimatedIso: string | null,
): FlightStatusLabel {
  const raw = (row.flight_status ?? "").toLowerCase();
  if (raw.includes("cancel")) return "Cancelled";
  if (raw.includes("divert")) return "Diverted";

  const scheduled = parseIso(scheduledIso);
  const estimated = parseIso(estimatedIso);
  if (scheduled && estimated) {
    const delayMin = (estimated.getTime() - scheduled.getTime()) / 60000;
    if (delayMin > DELAY_THRESHOLD_MIN) return "Delayed";
    if (delayMin >= -DELAY_THRESHOLD_MIN) return "On time";
  }
  if (raw === "active" || raw === "landed" || raw === "scheduled") return "On time";
  return "Unknown";
}

function mapToStatus(row: AviationStackFlight, flightNumber: string): FlightStatus | null {
  const scheduled = row.arrival?.scheduled ?? null;
  const estimated = row.arrival?.estimated ?? row.arrival?.scheduled ?? null;
  if (!scheduled && !estimated) return null;

  return {
    flightNumber: normalizeFlightNumber(row.flight?.iata ?? flightNumber),
    airline: row.airline?.name?.trim() || row.airline?.iata?.trim() || "Unknown airline",
    originIata: row.departure?.iata?.trim() || "???",
    scheduledArrival: scheduled,
    estimatedArrival: estimated !== scheduled ? estimated : null,
    statusLabel: statusLabelFromRow(row, scheduled, estimated),
  };
}

async function aviationStackFetch(url: URL): Promise<AviationStackFlight[] | null> {
  const key = apiKey();
  if (!key) return null;
  url.searchParams.set("access_key", key);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: AviationStackFlight[]; error?: unknown };
    if (json.error || !Array.isArray(json.data)) return null;
    return json.data;
  } catch {
    return null;
  }
}

function createAviationStackProvider(): FlightProvider {
  return {
    async fetchPpsArrivals(date: string) {
      const url = new URL("https://api.aviationstack.com/v1/flights");
      url.searchParams.set("arr_iata", PPS_IATA);
      url.searchParams.set("limit", "100");
      const rows = await aviationStackFetch(url);
      if (!rows) return null;
      const options: FlightOption[] = [];
      for (const row of rows) {
        if (!rowMatchesDate(row, date)) continue;
        const opt = mapToOption(row);
        if (opt) options.push(opt);
      }
      return options;
    },

    async fetchFlightStatus(flightNumber: string, date: string) {
      const url = new URL("https://api.aviationstack.com/v1/flights");
      url.searchParams.set("flight_iata", normalizeFlightNumber(flightNumber));
      url.searchParams.set("limit", "10");
      const rows = await aviationStackFetch(url);
      if (!rows?.length) return null;
      const dated = rows.filter((r) => rowMatchesDate(r, date));
      const pool = dated.length > 0 ? dated : rows;
      const match =
        pool.find((r) => r.arrival?.iata === PPS_IATA) ??
        pool.find((r) => !r.arrival?.iata) ??
        pool[0];
      return mapToStatus(match, flightNumber);
    },
  };
}

const provider = createAviationStackProvider();

function matchesQuery(flight: FlightOption, query: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return true;
  const num = flight.flightNumber.toLowerCase();
  const airline = flight.airline.toLowerCase();
  const origin = flight.originIata.toLowerCase();
  return num.includes(q) || airline.includes(q) || origin.includes(q);
}

export async function searchFlights(query: string, date: string): Promise<FlightSearchResult> {
  if (!apiKey()) return { flights: [], available: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { flights: [], available: false };

  const cacheKey = `arrivals:${PPS_IATA}:${date}`;
  let arrivals = getCached<FlightOption[]>(cacheKey);
  if (!arrivals) {
    const fetched = await provider.fetchPpsArrivals(date);
    if (!fetched) return { flights: [], available: false };
    arrivals = fetched;
    setCached(cacheKey, arrivals);
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) return { flights: [], available: true };

  const filtered = arrivals.filter((f) => matchesQuery(f, trimmed)).slice(0, 20);
  return { flights: filtered, available: true };
}

export async function getFlightStatus(
  flightNumber: string,
  date?: string,
  refresh = false,
): Promise<FlightStatusResult> {
  if (!apiKey()) return { status: null, available: false };
  const num = normalizeFlightNumber(flightNumber);
  if (!num) return { status: null, available: false };
  const flightDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

  const cacheKey = `status:${num}:${flightDate}`;
  if (refresh) invalidateCache(cacheKey);

  let status = getCached<FlightStatus>(cacheKey);
  if (!status) {
    const fetched = await provider.fetchFlightStatus(num, flightDate);
    if (!fetched) return { status: null, available: false };
    status = fetched;
    setCached(cacheKey, status);
  }

  return { status, available: true };
}
