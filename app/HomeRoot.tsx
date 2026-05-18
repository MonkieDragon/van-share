"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import SearchDayView from "@/components/Home/SearchDayView";

function isValidDayViewParams(route_id: string, date: string) {
  const validRoute =
    route_id === "puerto-princesa-el-nido" || route_id === "el-nido-puerto-princesa";
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  return validRoute && validDate;
}

function Landing() {
  return (
    <section className="max-w-[1140px] space-y-4 text-gray-900">
      <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
        Share a private van, pay less
      </h1>
      <p className="text-base text-gray-800">
        Van Share matches travelers going the same way—starting with{" "}
        <strong className="text-gray-950">Puerto Princesa ↔ El Nido</strong>. Use the search bar to
        pick route, date, and party size. No app-style dispatch: you coordinate pickup windows
        together.
      </p>
    </section>
  );
}

/**
 * Client-only home body: URL-driven landing vs day view. Avoids async server `searchParams` on `/`
 * (which was leaving layout `children` as built-in not-found for some Next 16 + Turbopack setups).
 */
export default function HomeRoot() {
  const searchParams = useSearchParams();
  const route_id = searchParams.get("route_id")?.trim() ?? "";
  const date = searchParams.get("date")?.trim() ?? "";
  const dayView = useMemo(() => isValidDayViewParams(route_id, date), [route_id, date]);

  return (
    <div className="space-y-6" translate="no" suppressHydrationWarning>
      {dayView ? (
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-100" aria-hidden />}>
          <SearchDayView />
        </Suspense>
      ) : (
        <Landing />
      )}
    </div>
  );
}
