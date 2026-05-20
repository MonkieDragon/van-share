"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import RouteSelector from "@/components/Passenger/RouteSelector";
import AddressInput from "@/components/Passenger/AddressInput";
import JourneyDatePicker, { createJourneyFieldClass } from "@/components/UI/JourneyDatePicker";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { collectCreateJourneyErrors } from "@/lib/createJourneyFormErrors";
import {
  estimatedTotalPricePhp,
  seatPriceFromTotal,
  vehicleKindForPriceEstimate,
} from "@/lib/createJourneyPrice";
import { computeMaxPassengers } from "@/lib/journeyTransport";
import { tomorrowLocalYmd } from "@/lib/journeyRouteEndpoints";
import type { GeocodePick } from "@/lib/geocodeTypes";
import type {
  BookedHostVehicleType,
  HostTransportMode,
  JourneyPriceMode,
  PreferredVehicleType,
} from "@/types/journey";
import { isValidGeocodePick } from "@/lib/validateGeocodePick";

const MapPicker = dynamic(() => import("@/components/Passenger/MapPicker"), { ssr: false });

function intOptions(min: number, max: number): number[] {
  const out: number[] = [];
  for (let i = min; i <= max; i++) out.push(i);
  return out;
}

function CountSelect({
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-950">{label}</span>
      <select
        className={`mt-1 ${createJourneyFieldClass}`}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {intOptions(min, max).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
    </label>
  );
}

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
    <fieldset className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
      <legend className="px-1 text-xs font-semibold text-gray-800">{legend}</legend>
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
  const [pickupPick, setPickupPick] = useState<GeocodePick | null>(null);
  const [dropoffPick, setDropoffPick] = useState<GeocodePick | null>(null);
  const [hostPassengers, setHostPassengers] = useState(2);
  const [cabinBags, setCabinBags] = useState(0);
  const [checkedBags, setCheckedBags] = useState(0);
  const [oversizedLuggage, setOversizedLuggage] = useState(false);
  const [havePets, setHavePets] = useState(false);
  const [allowPets, setAllowPets] = useState(false);
  const [notes, setNotes] = useState("");
  const [pickupStopMode, setPickupStopMode] = useState<"fixed" | "flexible">("fixed");
  const [dropoffStopMode, setDropoffStopMode] = useState<"fixed" | "flexible">("fixed");
  const [hostTransportMode, setHostTransportMode] = useState<HostTransportMode>("needs_vehicle");
  const [maxShareWith, setMaxShareWith] = useState(8);
  const [preferredVehicleType, setPreferredVehicleType] =
    useState<PreferredVehicleType>("dont_mind");
  const [hostVehicleType, setHostVehicleType] = useState<BookedHostVehicleType | "">("");
  const [emptySeatsForJoiners, setEmptySeatsForJoiners] = useState(1);
  const [hostVehicleMake, setHostVehicleMake] = useState("");
  const [hostVehicleModel, setHostVehicleModel] = useState("");
  const [priceMode, setPriceMode] = useState<JourneyPriceMode>("split_total");
  const [pricePerSeat, setPricePerSeat] = useState(700);
  const [totalPrice, setTotalPrice] = useState(7000);
  const [totalPriceCustomized, setTotalPriceCustomized] = useState(false);
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

  const hasBookedTransport =
    hostTransportMode === "own_vehicle" || hostTransportMode === "vehicle_booked";

  const maxPassengers = useMemo(
    () =>
      computeMaxPassengers({
        host_transport_mode: hostTransportMode,
        host_passenger_count: hostPassengers,
        min_vehicle_seats: hostTransportMode === "needs_vehicle" ? maxShareWith : null,
        host_vehicle_seats_offered: hasBookedTransport ? emptySeatsForJoiners : null,
      }),
    [
      hostTransportMode,
      hostPassengers,
      maxShareWith,
      emptySeatsForJoiners,
      hasBookedTransport,
    ],
  );

  const estimatedTotal = useMemo(
    () =>
      estimatedTotalPricePhp({
        routeId,
        hostTransportMode,
        preferredVehicleType,
        hostVehicleType,
      }),
    [routeId, hostTransportMode, preferredVehicleType, hostVehicleType],
  );

  const vehicleKind = useMemo(
    () =>
      vehicleKindForPriceEstimate({
        hostTransportMode,
        preferredVehicleType,
        hostVehicleType,
      }),
    [hostTransportMode, preferredVehicleType, hostVehicleType],
  );

  useEffect(() => {
    if (!totalPriceCustomized) setTotalPrice(estimatedTotal);
  }, [estimatedTotal, totalPriceCustomized]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (!u) {
        router.replace("/login?next=/create-journey");
        setAuthReady(true);
        return;
      }
      const res = await fetch("/api/profile");
      if (res.ok) {
        const json = (await res.json()) as { onboardingComplete?: boolean; isOperator?: boolean };
        if (json.isOperator) {
          router.replace("/operator/dashboard");
          setAuthReady(true);
          return;
        }
        if (!json.onboardingComplete) {
          router.replace("/onboarding?next=/create-journey");
          setAuthReady(true);
          return;
        }
      }
      setAuthed(true);
      setAuthReady(true);
      setDepartureDate((d) => d || tomorrowLocalYmd());
    });
  }, [router]);

  const submit = async () => {
    const errors = collectCreateJourneyErrors({
      routeId,
      departureDate,
      timeStart,
      pickupPick,
      dropoffPick,
      hostPassengers,
      hostTransportMode,
      maxShareWith,
      preferredVehicleType,
      hostVehicleType,
      emptySeatsForJoiners,
      hostVehicleMake,
      hostVehicleModel,
      priceMode,
      pricePerSeat,
      totalPrice,
      cabinBags,
      checkedBags,
      oversizedLuggage,
      havePets,
      allowPets,
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

      const res = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_id: routeId,
          departure_date: departureDate,
          time_window_start,
          pickup_location: pickup.displayName,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dropoff_location: dropoff.displayName,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          host_passenger_count: hostPassengers,
          cabin_bags_count: cabinBags,
          checked_bags_count: checkedBags,
          oversized_luggage: oversizedLuggage,
          have_pets: havePets,
          allow_pets: allowPets,
          notes: notes || null,
          pickup_stop_mode: pickupStopMode,
          dropoff_stop_mode: dropoffStopMode,
          host_transport_mode: hostTransportMode,
          min_vehicle_seats: hostTransportMode === "needs_vehicle" ? maxShareWith : null,
          preferred_vehicle_type:
            hostTransportMode === "needs_vehicle" ? preferredVehicleType : null,
          host_vehicle_type: hasBookedTransport ? hostVehicleType : null,
          host_vehicle_seats_offered: hasBookedTransport ? emptySeatsForJoiners : null,
          host_vehicle_make: hasBookedTransport ? hostVehicleMake.trim() || null : null,
          host_vehicle_model: hasBookedTransport ? hostVehicleModel.trim() || null : null,
          price_mode: priceMode,
          price_per_seat_php: priceMode === "per_seat" ? Math.round(pricePerSeat) : null,
          total_price_php: priceMode === "split_total" ? Math.round(totalPrice) : null,
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
          Post a planned private van leg so others can join. Coordination happens on Van Share.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Route</h2>
          <RouteSelector selectedRoute={routeId} setSelectedRoute={setRouteId} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Date & time</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <JourneyDatePicker
              valueYmd={departureDate}
              onChangeYmd={setDepartureDate}
              label="Travel date"
              labelClassName="text-sm font-semibold text-gray-950"
              fieldClassName={createJourneyFieldClass}
              className="relative min-w-0 flex-1"
            />
            <label className="block min-w-0 flex-1">
              <span className="text-sm font-semibold text-gray-950">Departure from</span>
              <input
                type="time"
                className={`mt-1 ${createJourneyFieldClass}`}
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
              />
            </label>
          </div>
        </section>

        {routeId && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Itinerary</h2>
            <div className="space-y-3">
              <AddressInput
                key={`pickup-${routeId}`}
                leg="pickup"
                setAddress={() => {}}
                setLatLng={() => {}}
                routeId={routeId}
                onValidatedChange={(_valid, pick) => setPickupPick(pick)}
              />
              <StopModeFieldset
                legend="Pickup style"
                value={pickupStopMode}
                onChange={setPickupStopMode}
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
            </div>
            <div className="space-y-3">
              <AddressInput
                key={`dropoff-${routeId}`}
                leg="dropoff"
                setAddress={() => {}}
                setLatLng={() => {}}
                routeId={routeId}
                onValidatedChange={(_valid, pick) => setDropoffPick(pick)}
              />
              <StopModeFieldset
                legend="Dropoff style"
                value={dropoffStopMode}
                onChange={setDropoffStopMode}
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
            </div>
          </section>
        )}

        <section className="space-y-3 rounded-lg border border-gray-200 p-3">
          <h2 className="text-sm font-bold text-gray-950">Your transport</h2>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="transport-mode"
                checked={hostTransportMode === "needs_vehicle"}
                onChange={() => setHostTransportMode("needs_vehicle")}
                className="mt-1"
              />
              No — I need a vehicle
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="transport-mode"
                checked={hostTransportMode === "own_vehicle"}
                onChange={() => setHostTransportMode("own_vehicle")}
                className="mt-1"
              />
              Yes — I have my own vehicle
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="transport-mode"
                checked={hostTransportMode === "vehicle_booked"}
                onChange={() => setHostTransportMode("vehicle_booked")}
                className="mt-1"
              />
              Yes — I already booked a vehicle
            </label>
          </div>
          {hostTransportMode === "needs_vehicle" ? (
            <div className="space-y-3">
              <CountSelect
                label="Maximum people to share with"
                value={maxShareWith}
                min={1}
                max={20}
                onChange={setMaxShareWith}
                hint="You can change this later once you have a vehicle booked. Van operators can express interest to fill this journey."
              />
              <label className="block">
                <span className="text-sm font-semibold text-gray-950">Preferred vehicle type</span>
                <select
                  className={`mt-1 ${createJourneyFieldClass}`}
                  value={preferredVehicleType}
                  onChange={(e) =>
                    setPreferredVehicleType(e.target.value as PreferredVehicleType)
                  }
                >
                  <option value="van">Van</option>
                  <option value="car">Car</option>
                  <option value="dont_mind">Don&apos;t mind</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-gray-950">Vehicle type</span>
                <select
                  className={`mt-1 ${createJourneyFieldClass}`}
                  value={hostVehicleType}
                  onChange={(e) => setHostVehicleType(e.target.value as BookedHostVehicleType)}
                >
                  <option value="">Select…</option>
                  <option value="van">Van</option>
                  <option value="car">Car</option>
                </select>
              </label>
              <CountSelect
                label="Empty seats available"
                value={emptySeatsForJoiners}
                min={1}
                max={10}
                onChange={setEmptySeatsForJoiners}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-950">Make (optional)</span>
                  <input
                    className={`mt-1 ${createJourneyFieldClass}`}
                    value={hostVehicleMake}
                    onChange={(e) => setHostVehicleMake(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-950">Model (optional)</span>
                  <input
                    className={`mt-1 ${createJourneyFieldClass}`}
                    value={hostVehicleModel}
                    onChange={(e) => setHostVehicleModel(e.target.value)}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-600">
                This journey shows as van booked. Operators cannot express interest.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-gray-200 p-3">
          <h2 className="text-sm font-bold text-gray-950">Price</h2>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="price-mode"
                checked={priceMode === "per_seat"}
                onChange={() => {
                  setPriceMode("per_seat");
                  setPricePerSeat(seatPriceFromTotal(totalPrice, maxPassengers));
                }}
                className="mt-1"
              />
              Set a price per seat
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-800">
              <input
                type="radio"
                name="price-mode"
                checked={priceMode === "split_total"}
                onChange={() => setPriceMode("split_total")}
                className="mt-1"
              />
              Split a total price across seats
            </label>
          </div>
          {priceMode === "per_seat" ? (
            <label className="block">
              <span className="text-sm font-semibold text-gray-950">Price per seat (₱)</span>
              <input
                type="number"
                min={0}
                step={50}
                className={`mt-1 ${createJourneyFieldClass}`}
                value={pricePerSeat}
                onChange={(e) => setPricePerSeat(Number(e.target.value))}
                onBlur={() =>
                  setPricePerSeat((n) => Math.max(50, Math.round(n / 50) * 50))
                }
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm font-semibold text-gray-950">Total price (₱)</span>
              <input
                type="number"
                min={0}
                step={100}
                className={`mt-1 ${createJourneyFieldClass}`}
                value={totalPrice}
                onChange={(e) => {
                  setTotalPriceCustomized(true);
                  setTotalPrice(Number(e.target.value));
                }}
                onBlur={() =>
                  setTotalPrice((n) => Math.max(100, Math.round(n / 100) * 100))
                }
              />
              <p className="mt-1 text-xs text-gray-600">
                {hostTransportMode === "needs_vehicle" ? (
                  <>
                    Estimated ₱{estimatedTotal.toLocaleString("en-PH")}{" "}
                    {vehicleKind} charter for this route
                    {totalPriceCustomized && totalPrice !== estimatedTotal
                      ? " — you entered a custom total"
                      : ""}
                    .
                  </>
                ) : (
                  <>Enter the full vehicle price you paid or expect to pay.</>
                )}
              </p>
            </label>
          )}
          <p className="text-sm text-gray-800">
            Joiners see about{" "}
            <strong className="text-gray-950">
              ₱
              {(priceMode === "per_seat"
                ? pricePerSeat
                : seatPriceFromTotal(totalPrice, maxPassengers)
              ).toLocaleString("en-PH")}{" "}
              per seat
            </strong>{" "}
            ({maxPassengers} seat{maxPassengers === 1 ? "" : "s"} max on this journey).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Your group</h2>
          <label className="block">
            <span className="text-sm font-semibold text-gray-950">Travelers in your party</span>
            <input
              type="number"
              min={1}
              max={20}
              className={`mt-1 ${createJourneyFieldClass}`}
              value={hostPassengers}
              onChange={(e) => setHostPassengers(Number(e.target.value))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-gray-950">Cabin bags</span>
              <input
                type="number"
                min={0}
                className={`mt-1 ${createJourneyFieldClass}`}
                value={cabinBags}
                onChange={(e) => setCabinBags(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-950">Checked bags</span>
              <input
                type="number"
                min={0}
                className={`mt-1 ${createJourneyFieldClass}`}
                value={checkedBags}
                onChange={(e) => setCheckedBags(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={oversizedLuggage}
              onChange={(e) => setOversizedLuggage(e.target.checked)}
            />
            Oversized luggage
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={havePets}
              onChange={(e) => setHavePets(e.target.checked)}
            />
            We have pets
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={allowPets}
              onChange={(e) => setAllowPets(e.target.checked)}
            />
            OK with other travelers&apos; pets
          </label>
        </section>

        <label className="block">
          <span className="font-semibold text-gray-950">Notes (optional)</span>
          <textarea
            className={`mt-1 ${createJourneyFieldClass}`}
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
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            role="alert"
          >
            {message.split(" · ").map((line) => (
              <p key={line} className="mt-1 first:mt-0">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
