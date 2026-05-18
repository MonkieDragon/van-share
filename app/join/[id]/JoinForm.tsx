"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AddressInput from "@/components/Passenger/AddressInput";
import PhoneContactInput from "@/components/UI/PhoneContactInput";
import { isValidStoredPhone } from "@/lib/createJourneyFormErrors";
import { isJourneyHostedByUser } from "@/lib/journeyHost";
import { effectiveJourneyStatus } from "@/lib/journeyLifecycle";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { JourneyListItem } from "@/types/journey";

export default function JoinForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [journey, setJourney] = useState<JourneyListItem | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupFlex, setPickupFlex] = useState("");
  const [, setPickupFlexLL] = useState<[number, number]>([10.33, 119.41]);
  const [dropFlex, setDropFlex] = useState("");
  const [, setDropFlexLL] = useState<[number, number]>([10.33, 119.41]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [luggage, setLuggage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string | null } | null>(null);

  useEffect(() => {
    const p = Number(searchParams.get("passengers"));
    if (Number.isFinite(p) && p >= 1) setPassengerCount(Math.floor(p));
  }, [searchParams]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) {
        setAuthUser(null);
        return;
      }
      setAuthUser({ id: u.id, email: u.email });
      if (u.email) setEmail(u.email);
      const meta = u.user_metadata as { full_name?: string; name?: string } | undefined;
      const n = meta?.full_name || meta?.name;
      if (n) setName(n);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setAuthUser(u ? { id: u.id, email: u.email } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/journeys/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setJourney(null);
          return;
        }
        setJourney(data);
        if ((data.dropoff_stop_mode ?? data.stop_mode) !== "flexible") {
          setDropFlex(data.dropoff_location ?? "");
        }
      } catch {
        if (!cancelled) setJourney(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (journey === undefined) {
    return (
      <div className="p-6 text-gray-900">
        <p>Loading…</p>
      </div>
    );
  }

  if (journey === null) {
    return (
      <div className="p-6 text-gray-900">
        <p className="font-semibold">Journey not found.</p>
        <Link href="/" className="mt-2 inline-block text-blue-700 underline">
          Home
        </Link>
      </div>
    );
  }

  const spots = journey.max_passengers - journey.total_passenger_count;
  const isOwn = isJourneyHostedByUser(journey, authUser);
  const paxStatus = effectiveJourneyStatus(journey.status, journey.departure_date);
  const canJoin =
    paxStatus === "open" && spots > 0 && journey.listing_status === "submitted" && !isOwn;
  const pickupIsFlexible =
    journey.pickup_stop_mode === "flexible" ||
    (journey.pickup_stop_mode == null && journey.stop_mode === "flexible");
  const dropoffIsFlexible =
    journey.dropoff_stop_mode === "flexible" ||
    (journey.dropoff_stop_mode == null && journey.stop_mode === "flexible");

  const submit = async () => {
    if (!canJoin) return;
    setLoading(true);
    setMsg("");
    try {
      const pickup_location = pickupIsFlexible ? pickupFlex.trim() : journey.pickup_location;
      const dropoff_location = dropoffIsFlexible ? dropFlex.trim() : journey.dropoff_location;
      if (pickupIsFlexible && !pickup_location) {
        setMsg("Enter your pickup along the route.");
        setLoading(false);
        return;
      }
      if (dropoffIsFlexible && !dropoff_location) {
        setMsg("Enter your dropoff along the route.");
        setLoading(false);
        return;
      }
      if (!isValidStoredPhone(phone)) {
        setMsg(
          "Contact number — enter a valid Philippine mobile (10 digits) or WhatsApp number with country code.",
        );
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/journeys/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          pickup_location,
          dropoff_location,
          passenger_count: passengerCount,
          luggage_count: luggage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Could not join");
        return;
      }
      setDone(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-12 text-gray-900">
      <Link href={`/journeys/${id}`} className="text-sm font-semibold text-blue-700 hover:underline">
        ← Back to journey
      </Link>
      <h1 className="text-2xl font-bold text-gray-950">Request to join</h1>
      <p className="text-sm text-gray-800">
        {journey.route?.name ?? journey.route_id} · {journey.departure_date} · up to {spots} seats
        available for new joiners (after host approval).
      </p>

      {done ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <p className="font-semibold">Application sent.</p>
          <p className="mt-2 text-sm">
            The host will accept or decline by email. You are not on the van until they confirm.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/journeys/${id}`)}
            className="mt-4 text-sm font-semibold text-blue-700 underline"
          >
            Back to journey
          </button>
        </div>
      ) : isOwn ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-950">
          <p className="font-semibold">This is your journey.</p>
          <p className="mt-2 text-sm">You cannot join a journey you posted. Manage join requests from your dashboard.</p>
          <Link
            href={`/my-journeys/${id}`}
            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Manage journey
          </Link>
        </div>
      ) : !canJoin ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          This journey is not accepting join requests right now.
        </p>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="font-semibold text-gray-950">Name</span>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="font-semibold text-gray-950">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <PhoneContactInput className="block" value={phone} onChange={setPhone} />

          {pickupIsFlexible && journey.route_id ? (
            <div>
              <span className="font-semibold text-gray-950">Your pickup along the route</span>
              <AddressInput
                leg="pickup"
                routeId={journey.route_id}
                setAddress={setPickupFlex}
                setLatLng={setPickupFlexLL}
              />
            </div>
          ) : null}
          {dropoffIsFlexible && journey.route_id ? (
            <div>
              <span className="font-semibold text-gray-950">Your dropoff along the route</span>
              <AddressInput
                leg="dropoff"
                routeId={journey.route_id}
                setAddress={setDropFlex}
                setLatLng={setDropFlexLL}
              />
            </div>
          ) : null}
          {!pickupIsFlexible && !dropoffIsFlexible ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
              <span className="font-semibold text-gray-950">Pickup:</span> {journey.pickup_location}
              <br />
              <span className="font-semibold text-gray-950">Dropoff:</span> {journey.dropoff_location}
            </p>
          ) : (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
              {!pickupIsFlexible && (
                <>
                  <span className="font-semibold text-gray-950">Pickup:</span> {journey.pickup_location}
                  <br />
                </>
              )}
              {!dropoffIsFlexible && (
                <>
                  <span className="font-semibold text-gray-950">Dropoff:</span> {journey.dropoff_location}
                </>
              )}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-semibold text-gray-950">Passengers</span>
              <input
                type="number"
                min={1}
                max={spots}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                value={passengerCount}
                onChange={(e) => setPassengerCount(Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="font-semibold text-gray-950">Luggage</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                value={luggage}
                onChange={(e) => setLuggage(Number(e.target.value))}
              />
            </label>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void submit()}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Request to join"}
          </button>
          {msg && <p className="text-sm text-red-800">{msg}</p>}
        </div>
      )}
    </div>
  );
}
