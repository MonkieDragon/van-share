"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import JourneyDatePicker from "@/components/UI/JourneyDatePicker";
import {
  endpointsFromRouteId,
  JOURNEY_LOCATIONS,
  routeIdFromEndpoints,
  tomorrowLocalYmd,
  type EndpointId,
} from "@/lib/journeyRouteEndpoints";

function hideSearchBar(pathname: string) {
  if (pathname.startsWith("/driver")) return true;
  if (pathname.startsWith("/my-journeys")) return true;
  if (pathname.startsWith("/onboarding")) return true;
  if (pathname === "/login" || pathname === "/signup") return true;
  if (pathname === "/create-journey") return true;
  if (pathname.startsWith("/messages")) return true;
  return false;
}

const fieldClass =
  "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm";

export default function GlobalJourneySearchBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [origin, setOrigin] = useState<EndpointId>(JOURNEY_LOCATIONS.pp.id);
  const [dest, setDest] = useState<EndpointId>(JOURNEY_LOCATIONS.en.id);
  const [dateYmd, setDateYmd] = useState("");
  const [msg, setMsg] = useState("");

  const routeId = routeIdFromEndpoints(origin, dest);

  const qDate = searchParams.get("date")?.trim() ?? "";
  const qRoute = searchParams.get("route_id")?.trim() ?? null;

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
  }, [qDate, qRoute]);

  const runSearch = () => {
    if (!routeId) {
      setMsg("Choose two different places for origin and destination.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
      setMsg("Pick a travel date.");
      return;
    }
    setMsg("");
    const qs = new URLSearchParams({
      route_id: routeId,
      date: dateYmd,
    });
    router.push(`/?${qs.toString()}`);
  };

  if (hideSearchBar(pathname)) {
    return null;
  }

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
          <JourneyDatePicker
            valueYmd={dateYmd}
            onChangeYmd={setDateYmd}
            routeId={routeId}
            showTripDots
            className="relative flex w-36 shrink-0 flex-col gap-0.5 sm:w-40"
          />
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
