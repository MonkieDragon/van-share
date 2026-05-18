"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RouteSelector from "@/components/Passenger/RouteSelector";
import AddressInput from "@/components/Passenger/AddressInput";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import PhoneContactInput from "@/components/UI/PhoneContactInput";
import { collectCreateJourneyErrors } from "@/lib/createJourneyFormErrors";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { isValidGeocodePick } from "@/lib/validateGeocodePick";

const MapPicker = dynamic(() => import("@/components/Passenger/MapPicker"), { ssr: false });

function StopModeFieldset({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: "fixed" | "flexible";
  onChange: (v: "fixed" | "flexible") => void;
}) {
  return (
    <fieldset className="rounded-lg border border-gray-200 p-3">
      <legend className="px-1 text-sm font-semibold text-gray-950">{legend}</legend>
      <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
        <input
          type="radio"
          name={`${legend}-mode`}
          checked={value === "fixed"}
          onChange={() => onChange("fixed")}
        />
        Fixed — one location for the whole van
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
        <input
          type="radio"
          name={`${legend}-mode`}
          checked={value === "flexible"}
          onChange={() => onChange("flexible")}
        />
        Flexible — each joiner sets their own
      </label>
    </fieldset>
  );
}

export default function CreateJourneyPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [pickupPick, setPickupPick] = useState<GeocodePick | null>(null);
  const [dropoffPick, setDropoffPick] = useState<GeocodePick | null>(null);
  const [hostPassengers, setHostPassengers] = useState(2);
  const [luggage, setLuggage] = useState(0);
  const [maxPassengers, setMaxPassengers] = useState(10);
  const [notes, setNotes] = useState("");
  const [pickupStopMode, setPickupStopMode] = useState<"fixed" | "flexible">("fixed");
  const [dropoffStopMode, setDropoffStopMode] = useState<"fixed" | "flexible">("fixed");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const pickupLatLng = useMemo(
    (): [number, number] =>
      pickupPick ? [pickupPick.lat, pickupPick.lng] : [10.33, 119.41],
    [pickupPick],
  );
  const dropoffLatLng = useMemo(
    (): [number, number] =>
      dropoffPick ? [dropoffPick.lat, dropoffPick.lng] : [10.33, 119.41],
    [dropoffPick],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) {
        router.replace("/login?next=/create-journey");
        setAuthReady(true);
        return;
      }
      setAuthed(true);
      setAuthReady(true);
      const meta = u.user_metadata as { full_name?: string; name?: string } | undefined;
      const n = meta?.full_name || meta?.name;
      if (n) setHostName(n);
    });
  }, [router]);

  useEffect(() => {
    setPickupPick(null);
    setDropoffPick(null);
  }, [routeId]);

  const submit = async () => {
    const errors = collectCreateJourneyErrors({
      routeId,
      departureDate,
      timeStart,
      hostName,
      hostPhone,
      pickupPick,
      dropoffPick,
      hostPassengers,
      maxPassengers,
    });
    if (errors.length > 0) {
      setMessage(errors.join(" · "));
      return;
    }
    if (!routeId || !isValidGeocodePick(pickupPick) || !isValidGeocodePick(dropoffPick)) {
      return;
    }
    const pickup = pickupPick!;
    const dropoff = dropoffPick!;

    setLoading(true);
    setMessage("");
    try {
      const time_window_start = timeStart.length === 5 ? `${timeStart}:00` : timeStart;
      const time_window_end =
        timeEnd.trim() === "" ? null : timeEnd.length === 5 ? `${timeEnd}:00` : timeEnd;

      const res = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_id: routeId,
          departure_date: departureDate,
          time_window_start,
          time_window_end,
          host_name: hostName,
          host_phone: hostPhone,
          pickup_location: pickup.displayName,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dropoff_location: dropoff.displayName,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          host_passenger_count: hostPassengers,
          luggage_count: luggage,
          max_passengers: maxPassengers,
          notes: notes || null,
          pickup_stop_mode: pickupStopMode,
          dropoff_stop_mode: dropoffStopMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong");
        return;
      }
      router.push(`/journeys/${data.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !authed) {
    return (
      <div className="py-12 text-center text-sm text-gray-600">
        {!authReady ? "Loading…" : "Redirecting to sign in…"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-12 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Start a journey</h1>
        <p className="mt-1 text-sm text-gray-800">
          Post a planned private van leg so others can join. You will share contact details with
          joiners and any operator who claims the trip.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <RouteSelector selectedRoute={routeId} setSelectedRoute={setRouteId} />

        <StopModeFieldset
          legend="Pickup style"
          value={pickupStopMode}
          onChange={setPickupStopMode}
        />
        <StopModeFieldset
          legend="Dropoff style"
          value={dropoffStopMode}
          onChange={setDropoffStopMode}
        />

        <label className="block">
          <span className="font-semibold text-gray-950">Travel date</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-gray-950">Departure from</span>
            <input
              type="time"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-gray-950">Until (optional)</span>
            <input
              type="time"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-gray-950">Your name</span>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            required
          />
        </label>
        <PhoneContactInput
          className="block"
          value={hostPhone}
          onChange={setHostPhone}
        />

        {routeId && (
          <>
            <AddressInput
              leg="pickup"
              setAddress={() => {}}
              setLatLng={() => {}}
              routeId={routeId}
              onValidatedChange={(_valid, pick) => setPickupPick(pick)}
            />
            {isValidGeocodePick(pickupPick) && (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <MapPicker
                  latLng={pickupLatLng}
                  setLatLng={(ll) =>
                    setPickupPick((prev) =>
                      prev ? { ...prev, lat: ll[0], lng: ll[1] } : null,
                    )
                  }
                  routeId={routeId}
                />
              </div>
            )}
            <AddressInput
              leg="dropoff"
              setAddress={() => {}}
              setLatLng={() => {}}
              routeId={routeId}
              onValidatedChange={(_valid, pick) => setDropoffPick(pick)}
            />
            {isValidGeocodePick(dropoffPick) && (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <MapPicker
                  latLng={dropoffLatLng}
                  setLatLng={(ll) =>
                    setDropoffPick((prev) =>
                      prev ? { ...prev, lat: ll[0], lng: ll[1] } : null,
                    )
                  }
                  routeId={routeId}
                />
              </div>
            )}
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="font-semibold text-gray-950">Your group</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={hostPassengers}
              onChange={(e) => setHostPassengers(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-gray-950">Luggage bags</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={luggage}
              onChange={(e) => setLuggage(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="font-semibold text-gray-950">Van capacity</span>
            <input
              type="number"
              min={2}
              max={20}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={maxPassengers}
              onChange={(e) => setMaxPassengers(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-gray-950">Notes (optional)</span>
          <textarea
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Flexible by 30 min, prefer direct hotel pickup, etc."
          />
        </label>

        <button
          type="button"
          onClick={() => void submit()}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Posting…" : "Post journey"}
        </button>
        {message && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
            {message.split(" · ").map((line) => (
              <p key={line} className={line !== message.split(" · ")[0] ? "mt-1" : undefined}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
