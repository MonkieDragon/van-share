"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import DateStrip from "@/components/Home/DateStrip";
import JourneyCard from "@/components/Journey/JourneyCard";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { addDaysYmd } from "@/lib/journeyRouteEndpoints";
import { endpointsFromRouteId } from "@/lib/journeyRouteEndpoints";
import { isJourneyHostedByUser } from "@/lib/journeyHost";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { JourneyListItem } from "@/types/journey";

const BrowseMapPanel = dynamic(() => import("@/components/Home/BrowseMapPanel"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-lg bg-gray-100" aria-hidden />,
});

const searchFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Search failed");
    return res.json() as Promise<JourneyListItem[]>;
  });

const hintsFetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) return { dates: [] as string[] };
    return res.json() as Promise<{ dates: string[] }>;
  });

export default function SearchDayView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const route_id = searchParams.get("route_id")?.trim() ?? "";
  const date = searchParams.get("date")?.trim() ?? "";
  const journeyParam = searchParams.get("journey")?.trim() ?? "";

  const ends = useMemo(() => endpointsFromRouteId(route_id), [route_id]);

  const [userPickup, setUserPickup] = useState<GeocodePick | null>(null);
  const [userDropoff, setUserDropoff] = useState<GeocodePick | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      setAuthUser(u ? { id: u.id, email: u.email } : null);
      if (u) {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const body = (await res.json()) as { isOperator?: boolean };
          setIsOperator(!!body.isOperator);
        } else {
          setIsOperator(false);
        }
      } else {
        setIsOperator(false);
      }
    };
    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, []);

  const replaceQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      router.replace(s ? `/?${s}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (searchParams.has("passengers")) {
      replaceQuery({ passengers: null });
    }
  }, [searchParams, replaceQuery]);

  const searchUrl =
    route_id && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? `/api/journeys/search?route_id=${encodeURIComponent(route_id)}&date=${encodeURIComponent(date)}`
      : null;

  const { data: results = [], error: swrError, isLoading: loading } = useSWR<JourneyListItem[]>(
    searchUrl,
    searchFetcher,
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  const err = swrError ? (swrError instanceof Error ? swrError.message : "Search failed") : null;

  const stripDates = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [-2, -1, 0, 1, 2].map((d) => addDaysYmd(date, d));
  }, [date]);

  const hintsUrl =
    route_id && stripDates.length === 5
      ? `/api/journeys/search-day-hints?route_id=${encodeURIComponent(route_id)}&dates=${stripDates.join(",")}`
      : null;

  const { data: hintsData } = useSWR(hintsUrl, hintsFetcher, { revalidateOnFocus: false });

  const hasJourneysByYmd = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const d of hintsData?.dates ?? []) {
      map[d] = true;
    }
    return map;
  }, [hintsData]);

  useEffect(() => {
    if (!journeyParam || loading) return;
    if (results.length > 0 && !results.some((j) => j.id === journeyParam)) {
      replaceQuery({ journey: null });
    }
  }, [journeyParam, results, loading, replaceQuery]);

  const selectedJourney = useMemo(
    () => results.find((j) => j.id === journeyParam) ?? null,
    [results, journeyParam],
  );

  const onDateStrip = useCallback(
    (ymd: string) => {
      replaceQuery({ date: ymd, journey: null });
    },
    [replaceQuery],
  );

  const toggleJourney = useCallback(
    (id: string) => {
      if (journeyParam === id) replaceQuery({ journey: null });
      else replaceQuery({ journey: id });
    },
    [journeyParam, replaceQuery],
  );

  const returnHref = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("journey");
    const s = next.toString();
    return s ? `/?${s}` : "/";
  }, [searchParams]);

  const detailQuery = useMemo(() => {
    return `return=${encodeURIComponent(returnHref)}`;
  }, [returnHref]);

  if (!ends) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Invalid route. Use the search bar to pick origin and destination.
      </p>
    );
  }

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
      <BrowseMapPanel
        routeId={route_id}
        originEndpointId={ends.origin}
        destEndpointId={ends.dest}
        selectedJourney={selectedJourney}
        userPickup={userPickup}
        userDropoff={userDropoff}
        onPickupPick={setUserPickup}
        onDropoffPick={setUserDropoff}
        hideAddressPanel={isOperator}
      />
      <div className="min-w-0 w-full space-y-3">
        <DateStrip selectedYmd={date} onSelectYmd={onDateStrip} hasJourneysByYmd={hasJourneysByYmd} />
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{err}</p>
        )}
        {loading ? (
          <p className="text-sm text-gray-600">Loading journeys…</p>
        ) : results.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800">
            No journeys for this day. Try another date in the strip above or change direction in the
            search bar.
          </p>
        ) : (
          <ul className="w-full space-y-3">
            {results.map((j) => (
              <li key={j.id} className="w-full">
                <JourneyCard
                  journey={j}
                  selected={journeyParam === j.id}
                  onSelect={() => toggleJourney(j.id)}
                  detailQuery={detailQuery}
                  isOwn={isJourneyHostedByUser(j, authUser)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
