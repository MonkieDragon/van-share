import Link from "next/link";
import { notFound } from "next/navigation";
import JourneyDetailBackLink from "@/components/Journey/JourneyDetailBackLink";
import JourneyStatusBadges from "@/components/Journey/JourneyStatusBadges";
import { isJourneyHostedByUser } from "@/lib/journeyHost";
import {
  canViewHostContact,
  canConfirmedPassengerViewHost,
  hostContactFields,
  passengerContactFields,
} from "@/lib/journeyContactVisibility";
import { effectiveJourneyStatus } from "@/lib/journeyLifecycle";
import { seatPricePerPersonPhp, totalPriceBasisLabel } from "@/lib/journeyPricing";
import ClaimJourneyButton from "@/components/Operator/ClaimJourneyButton";
import HideJourneyButton from "@/components/Operator/HideJourneyButton";
import OperatorSelectedActions from "@/components/Operator/OperatorSelectedActions";
import { getAccountContext } from "@/lib/accountProfile";
import { defaultVanName } from "@/lib/defaultVanName";
import { findOperatorThreadId } from "@/lib/messaging";
import { isJourneyHiddenForOperator } from "@/lib/operatorHiddenJourneys";
import { getJourneyById, getJourneyDetailById } from "@/lib/listPublicJourneys";
import { isPpsAirportJourneyPickup } from "@/lib/flightPpsPickup";
import FlightStatusSection from "@/components/Flight/FlightStatusSection";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DbOperatorVehicle } from "@/types/operator";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return?: string }>;
};

function formatDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatWindow(start: string, end: string | null) {
  const s = start.slice(0, 5);
  if (!end) return s;
  return `${s} – ${end.slice(0, 5)}`;
}

function ratingSummary(avg: number | null, count: number) {
  if (count === 0 || avg == null) return "No reviews yet";
  const rounded = Math.round(avg * 10) / 10;
  return `${rounded.toFixed(1)} / 10 · ${count} review${count === 1 ? "" : "s"}`;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const j = await getJourneyById(id);
  if (!j) return { title: "Journey | Van Share" };
  const name = j.route?.name ?? j.route_id;
  return { title: `${name} · ${j.departure_date} | Van Share` };
}

export default async function JourneyDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const returnHref = sp.return?.trim() || null;
  const journey = await getJourneyDetailById(id);
  if (!journey) notFound();

  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  const isOwn = isJourneyHostedByUser(journey, user);

  const routeName = journey.route?.name ?? journey.route_id;
  const paxStatus = effectiveJourneyStatus(journey.status, journey.departure_date);
  const spotsLeft = journey.max_passengers - journey.total_passenger_count;
  const canJoin = paxStatus === "open" && spotsLeft > 0 && !isOwn;

  const claim = journey.booked_claim;
  const op = claim?.operators;
  const ctx = user ? await getAccountContext(user.id) : null;
  const isOperator = ctx?.isOperator ?? false;
  const myClaim = journey.my_operator_claim;
  const operatorId = ctx?.operator?.id ?? null;

  const activeOperatorClaim =
    myClaim &&
    (myClaim.status === "interested" ||
      myClaim.status === "selected" ||
      myClaim.status === "driver_confirmed");

  if (isOperator && ctx?.operator && !isOwn) {
    const hidden = await isJourneyHiddenForOperator(ctx.operator.id, id);
    if (hidden && !activeOperatorClaim) notFound();
  }

  const canHideJourney =
    isOperator && !isOwn && journey.host_transport_mode === "needs_vehicle" && !activeOperatorClaim;

  let operatorFleet: { id: string; name: string; make: string; model: string; seat_count: number | null }[] =
    [];
  if (isOperator && ctx?.operator && !isOwn) {
    const svc = createServiceClient();
    const { data: vRows } = await svc
      .from("operator_vehicles")
      .select("*")
      .eq("operator_id", ctx.operator.id)
      .order("created_at", { ascending: true });
    operatorFleet = ((vRows ?? []) as DbOperatorVehicle[]).map((v, i) => ({
      id: v.id,
      name: v.name?.trim() || defaultVanName(i),
      make: v.make,
      model: v.model,
      seat_count: v.seat_count,
    }));
  }

  const operatorThreadId =
    myClaim && (myClaim.status === "selected" || myClaim.contact_unlocked_at)
      ? await findOperatorThreadId(myClaim.id)
      : null;

  const showHostToOperator =
    myClaim &&
    canViewHostContact(journey, myClaim, { role: "operator", operatorId: myClaim.operator_id });

  const myParticipant = journey.confirmed_participants.find(
    (p) => user && p.user_id === user.id,
  );
  const showHostContactForPassenger =
    myParticipant && canConfirmedPassengerViewHost(myParticipant, user?.id);

  const showPassengersToOperator =
    myClaim &&
    (myClaim.status === "selected" || myClaim.status === "driver_confirmed") &&
    journey.confirmed_participants.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-gray-900">
      <JourneyDetailBackLink returnHref={returnHref} />

      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-700">
          {formatDate(journey.departure_date)} · {formatWindow(journey.time_window_start, journey.time_window_end)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-950">{routeName}</h1>
          {isOwn && (
            <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-950">
              Your journey
            </span>
          )}
        </div>
        <p className="mt-4 text-lg font-semibold text-gray-950">
          ₱{seatPricePerPersonPhp(journey).toLocaleString("en-PH")} per seat
        </p>
        <p className="mt-1 text-sm text-gray-800">
          {journey.price_mode === "per_seat"
            ? "Fixed price set by the host."
            : totalPriceBasisLabel(journey) ??
              `Total split across up to ${journey.max_passengers} seats.`}
          {journey.price_mode === "split_total" && journey.total_price_php != null && (
            <>
              {" "}
              Total ₱{journey.total_price_php.toLocaleString("en-PH")}.
            </>
          )}
        </p>
        <p className="mt-4 text-sm text-gray-800">
          <span className="font-semibold text-gray-950">Pickup:</span> {journey.pickup_location}
        </p>
        <p className="text-sm text-gray-800">
          <span className="font-semibold text-gray-950">Dropoff:</span> {journey.dropoff_location}
        </p>
        <p className="mt-2 text-sm text-gray-800">
          <span className="font-semibold text-gray-950">Seats:</span> {journey.total_passenger_count} /{" "}
          {journey.max_passengers} · Host party {journey.host_passenger_count}
        </p>
        {journey.notes && (
          <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
            <span className="font-semibold text-gray-950">Notes:</span> {journey.notes}
          </p>
        )}
        <div className="mt-4">
          <JourneyStatusBadges
            vanBookingStatus={journey.van_booking_status}
            passengerStatus={journey.status}
            departureDate={journey.departure_date}
            hostTransportMode={journey.host_transport_mode}
            hostHasOwnVehicle={journey.host_has_own_vehicle}
            hostVehicleType={journey.host_vehicle_type}
            hostVehicleSeatsOffered={journey.host_vehicle_seats_offered}
            hostVehicleMake={journey.host_vehicle_make}
            hostVehicleModel={journey.host_vehicle_model}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {canJoin && !isOperator && (
            <Link
              href={`/join/${journey.id}`}
              className="inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Request to join
            </Link>
          )}
          {isOwn && (
            <Link
              href={`/my-journeys/${journey.id}`}
              className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-semibold text-indigo-950 hover:bg-indigo-100"
            >
              Manage journey
            </Link>
          )}
        </div>
      </header>

      {journey.flight_number && isPpsAirportJourneyPickup(journey) && (
        <FlightStatusSection
          flightNumber={journey.flight_number}
          flightAirline={journey.flight_airline}
          flightOriginIata={journey.flight_origin_iata}
          storedScheduledArrival={journey.flight_scheduled_arrival}
          departureDate={journey.departure_date}
        />
      )}

      {isOperator && !isOwn && journey.host_transport_mode === "needs_vehicle" && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Vehicle for this trip</h2>
          {myClaim?.status === "interested" ? (
            <div className="mt-3 space-y-3">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                Awaiting response — the host will review your offer.
              </p>
              <ClaimJourneyButton
                journeyId={journey.id}
                minPassengerSeats={journey.total_passenger_count}
                maxVanSeats={journey.max_passengers}
                fleet={operatorFleet}
                expressedInterest={{
                  claimId: myClaim.id,
                  operator_vehicle_id: myClaim.operator_vehicle_id,
                  proposed_price_php: myClaim.proposed_price_php,
                  vehicle_make: myClaim.vehicle_make,
                  vehicle_model: myClaim.vehicle_model,
                  vehicle_seat_count: myClaim.vehicle_seat_count,
                }}
              />
            </div>
          ) : myClaim?.status === "selected" ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-gray-800">The host selected your van. Message them to coordinate.</p>
              <OperatorSelectedActions claimId={myClaim.id} threadId={operatorThreadId} />
            </div>
          ) : journey.van_booking_status === "not_booked" ? (
            <div className="mt-3">
              <ClaimJourneyButton
                journeyId={journey.id}
                minPassengerSeats={journey.total_passenger_count}
                maxVanSeats={journey.max_passengers}
                fleet={operatorFleet}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-700">This journey already has transport arranged.</p>
          )}
          {canHideJourney && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <HideJourneyButton journeyId={journey.id} returnHref={returnHref} />
            </div>
          )}
        </section>
      )}

      {showHostContactForPassenger && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-blue-950">Host contact</h2>
          {(() => {
            const c = hostContactFields(journey);
            return (
              <p className="mt-2 text-sm text-blue-900">
                {c.name} · {c.email}
              </p>
            );
          })()}
        </section>
      )}

      {showHostToOperator && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-emerald-950">Host contact</h2>
          {(() => {
            const c = hostContactFields(journey);
            return (
              <p className="mt-2 text-sm text-emerald-900">
                {c.name} · {c.email}
              </p>
            );
          })()}
        </section>
      )}

      {showPassengersToOperator && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Confirmed passengers</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-800">
            {journey.confirmed_participants.map((p) => (
              <li key={p.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="font-semibold text-gray-950">{p.name}</p>
                <p>
                  {p.passenger_count} pax · {p.pickup_location} → {p.dropoff_location}
                </p>
                <p className="text-gray-700">
                  {p.email}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {journey.van_booking_status === "booked" && claim && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-emerald-950">Matched operator & vehicle</h2>
          {op ? (
            <p className="mt-1 text-sm text-emerald-900">
              <span className="font-semibold text-emerald-950">{op.company_name}</span>
              {" · "}
              {op.contact_name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-emerald-900">Operator profile is loading or unavailable.</p>
          )}
          <p className="mt-3 text-sm text-emerald-900">
            <span className="font-semibold text-emerald-950">Lifetime rating:</span>{" "}
            {ratingSummary(journey.operator_rating_avg, journey.operator_rating_count)}
          </p>
          {claim.vehicle_make && claim.vehicle_model && claim.vehicle_seat_count != null ? (
            <p className="mt-3 text-sm text-emerald-900">
              <span className="font-semibold text-emerald-950">Vehicle:</span> {claim.vehicle_make}{" "}
              {claim.vehicle_model} · {claim.vehicle_seat_count} seats
            </p>
          ) : (
            <p className="mt-3 text-sm text-emerald-900">Vehicle details were not recorded for this trip.</p>
          )}
          {claim.vehicle_image_urls && claim.vehicle_image_urls.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {claim.vehicle_image_urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-emerald-200 bg-white"
                >
                  <img src={url} alt="Vehicle" className="h-36 w-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-emerald-900">
            Final pickup order and contact details are coordinated by email between the host and operator.
          </p>
        </section>
      )}

      {journey.van_booking_status === "booked" && journey.journey_reviews.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Reviews for this trip</h2>
          <ul className="mt-4 space-y-4">
            {journey.journey_reviews.map((r) => (
              <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-amber-700">{r.rating} / 10</p>
                {r.review_text && <p className="mt-2 text-sm text-gray-800">{r.review_text}</p>}
                <p className="mt-2 text-xs text-gray-600">
                  {new Date(r.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
