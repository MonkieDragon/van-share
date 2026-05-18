"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  endpointsFromRouteId,
  JOURNEY_LOCATIONS,
  routeIdFromEndpoints,
  tomorrowLocalYmd,
  ymdFromDate,
  type EndpointId,
} from "@/lib/journeyRouteEndpoints";
import { formatDayShort } from "@/lib/formatDisplayDate";

function hideSearchBar(pathname: string) {
  if (pathname.startsWith("/operator")) return true;
  if (pathname.startsWith("/driver")) return true;
  if (pathname.startsWith("/my-journeys")) return true;
  if (pathname === "/login" || pathname === "/signup") return true;
  if (pathname === "/create-journey") return true;
  return false;
}

export default function GlobalJourneySearchBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState<EndpointId>(JOURNEY_LOCATIONS.pp.id);
  const [dest, setDest] = useState<EndpointId>(JOURNEY_LOCATIONS.en.id);
  /** Empty until client applies URL date or local "tomorrow" (avoids SSR UTC vs browser TZ mismatch). */
  const [dateYmd, setDateYmd] = useState("");
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [passengers, setPassengers] = useState(1);
  const [showCal, setShowCal] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [datesWithTrips, setDatesWithTrips] = useState<Set<string>>(new Set());
  const [loadingDots, setLoadingDots] = useState(false);
  const [msg, setMsg] = useState("");

  const routeId = useMemo(() => routeIdFromEndpoints(origin, dest), [origin, dest]);

  const selectedDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return new Date();
    const [y, m, d] = dateYmd.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [dateYmd]);

  const qDate = searchParams.get("date")?.trim() ?? "";
  const qRoute = searchParams.get("route_id")?.trim() ?? null;
  const qPassengers = searchParams.get("passengers")?.trim() ?? "";

  useLayoutEffect(() => {
    const ends = endpointsFromRouteId(qRoute);
    if (ends) {
      setOrigin(ends.origin);
      setDest(ends.dest);
    }
    if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) {
      setDateYmd(qDate);
    } else {
      setDateYmd((prev) => (prev ? prev : tomorrowLocalYmd()));
    }
    if (qPassengers) {
      const n = Number(qPassengers);
      if (Number.isFinite(n) && n >= 1 && n <= 10) setPassengers(Math.floor(n));
    }
  }, [qDate, qRoute, qPassengers]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return;
    const [y, m] = dateYmd.split("-").map(Number);
    setMonth(new Date(y, m - 1, 1));
  }, [dateYmd]);

  const loadDots = useCallback(async () => {
    if (!routeId) return;
    setLoadingDots(true);
    try {
      const y = month.getFullYear();
      const m = month.getMonth() + 1;
      const res = await fetch(`/api/journeys/availability?route_id=${routeId}&year=${y}&month=${m}`);
      const data = (await res.json()) as { dates?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Availability failed");
      setDatesWithTrips(new Set(data.dates ?? []));
    } catch {
      setDatesWithTrips(new Set());
    } finally {
      setLoadingDots(false);
    }
  }, [routeId, month]);

  useEffect(() => {
    void loadDots();
  }, [loadDots]);

  useEffect(() => {
    if (!showCal) return;
    const close = (e: MouseEvent) => {
      if (datePickerRef.current?.contains(e.target as Node)) return;
      setShowCal(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showCal]);

  const modifiers = useMemo(() => {
    const withTrips = [...datesWithTrips].map((s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
    return { hasTrips: withTrips };
  }, [datesWithTrips]);

  const runSearch = () => {
    if (!routeId) {
      setMsg("Choose two different places for origin and destination.");
      return;
    }
    setMsg("");
    const qs = new URLSearchParams({
      route_id: routeId,
      date: dateYmd,
      passengers: String(passengers),
    });
    router.push(`/?${qs.toString()}`);
  };

  if (hideSearchBar(pathname)) {
    return null;
  }

  const fieldClass =
    "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm";

  return (
    <div
      className="w-full border-b border-gray-200 bg-white shadow-sm"
      translate="no"
      suppressHydrationWarning
    >
      <div className="mx-auto w-full max-w-[1140px] px-4 py-3 sm:px-6">
        <div
          className="flex min-h-[2.5rem] w-full min-w-0 flex-nowrap items-end gap-2 sm:gap-3"
          suppressHydrationWarning
        >
          <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs font-semibold text-gray-700">
            Origin
            <select
              className={fieldClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value as EndpointId)}
            >
              <option value={JOURNEY_LOCATIONS.pp.id}>{JOURNEY_LOCATIONS.pp.label}</option>
              <option value={JOURNEY_LOCATIONS.en.id}>{JOURNEY_LOCATIONS.en.label}</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs font-semibold text-gray-700">
            Destination
            <select
              className={fieldClass}
              value={dest}
              onChange={(e) => setDest(e.target.value as EndpointId)}
            >
              <option value={JOURNEY_LOCATIONS.pp.id}>{JOURNEY_LOCATIONS.pp.label}</option>
              <option value={JOURNEY_LOCATIONS.en.id}>{JOURNEY_LOCATIONS.en.label}</option>
            </select>
          </label>
          <div
            ref={datePickerRef}
            className="relative flex w-36 shrink-0 flex-col gap-0.5 text-xs font-semibold text-gray-700 sm:w-40"
          >
            Date
            <button
              type="button"
              className={`${fieldClass} flex w-full items-center justify-between gap-1`}
              onClick={() => setShowCal((v) => !v)}
            >
              <span className="truncate text-xs">
                {dateYmd ? formatDayShort(dateYmd) : "—"}
              </span>
              <span className="shrink-0 text-xs text-gray-500">{loadingDots ? "…" : ""}</span>
            </button>
            {showCal && (
              <div className="absolute left-0 top-full z-30 mt-1 rounded-xl border border-gray-200 bg-white p-3 text-gray-900 shadow-lg">
                <DayPicker
                  mode="single"
                  month={month}
                  onMonthChange={setMonth}
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      setDateYmd(ymdFromDate(d));
                      setShowCal(false);
                    }
                  }}
                  modifiers={modifiers}
                  modifiersClassNames={{
                    hasTrips: "day-with-journeys",
                  }}
                />
                <p className="mt-2 text-xs text-gray-600">Blue dot: at least one open journey that day.</p>
              </div>
            )}
          </div>
          <div className="flex w-[5.5rem] shrink-0 flex-col gap-0.5 text-xs font-semibold text-gray-700">
            <span>Pax</span>
            <div className="flex items-center justify-center gap-0.5 rounded-lg border border-gray-300 bg-white px-1 py-0.5 shadow-sm">
              <button
                type="button"
                className="rounded px-2 py-1 text-sm font-bold text-gray-800 hover:bg-gray-100 disabled:opacity-40"
                disabled={passengers <= 1}
                onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              >
                −
              </button>
              <span className="min-w-[1.25rem] text-center text-sm font-bold">{passengers}</span>
              <button
                type="button"
                className="rounded px-2 py-1 text-sm font-bold text-gray-800 hover:bg-gray-100"
                onClick={() => setPassengers((p) => Math.min(10, p + 1))}
              >
                +
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={runSearch}
            className="mb-0.5 shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700 sm:px-5"
          >
            Search
          </button>
        </div>
        {msg && <p className="mt-2 text-sm font-medium text-amber-800">{msg}</p>}
      </div>
    </div>
  );
}
