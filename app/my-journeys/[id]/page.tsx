import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import JoinRequestRow from "@/components/Host/JoinRequestRow";
import JourneyHostActions from "@/components/Host/JourneyHostActions";
import VanBookingActions from "@/components/Host/VanBookingActions";
import VanOfferRow from "@/components/Host/VanOfferRow";
import JourneyStatusBadges from "@/components/Journey/JourneyStatusBadges";
import { formatHostVehicleSummary } from "@/lib/hostVehicle";
import { effectiveJourneyStatus, vanBookingHostLabel } from "@/lib/journeyLifecycle";
import { findPassengerThreadId } from "@/lib/messaging";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapJourneyRow } from "@/lib/listPublicJourneys";
import type { DbJourneyParticipant, OperatorClaimWithOperator } from "@/types/journey";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata() {
  return { title: "Manage journey | Van Share" };
}

export default async function ManageJourneyPage({ params }: Props) {
  const { id } = await params;
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/my-journeys/${id}`)}`);

  const svc = createServiceClient();
  const { data: row, error: jErr } = await svc
    .from("journeys")
    .select("*, routes(*)")
    .eq("id", id)
    .maybeSingle();

  if (jErr || !row) notFound();
  const journey = mapJourneyRow(row as Record<string, unknown>);
  journey.status = effectiveJourneyStatus(journey.status, journey.departure_date);
  if (!journey.host_user_id || journey.host_user_id !== user.id) notFound();

  const { data: participants, error: pErr } = await svc
    .from("journey_participants")
    .select("*")
    .eq("journey_id", id)
    .order("created_at", { ascending: true });

  if (pErr) throw pErr;

  const { data: interestsRaw } = await svc
    .from("operator_claims")
    .select("*, operators(*), operator_vehicles(*)")
    .eq("journey_id", id)
    .eq("status", "interested")
    .order("created_at", { ascending: true });

  let selectedClaim: OperatorClaimWithOperator | null = null;
  if (journey.selected_operator_claim_id) {
    const { data: sel } = await svc
      .from("operator_claims")
      .select("*, operators(*), operator_vehicles(*)")
      .eq("id", journey.selected_operator_claim_id)
      .maybeSingle();
    if (sel) selectedClaim = sel as OperatorClaimWithOperator;
  }

  const pending = (participants ?? []).filter((p) => (p as { status: string }).status === "pending");
  const confirmed = (participants ?? []).filter((p) => (p as { status: string }).status === "confirmed");
  const declined = (participants ?? []).filter((p) => (p as { status: string }).status === "declined");
  const interests = (interestsRaw ?? []) as (OperatorClaimWithOperator & {
    operator_vehicles?: unknown;
  })[];

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-gray-900">
      <Link href="/my-journeys" className="text-sm font-semibold text-blue-700 hover:underline">
        ← My journeys
      </Link>
      <header>
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
        {journey.host_has_own_vehicle && (() => {
          const summary = formatHostVehicleSummary(journey);
          return (
            <p className="mt-2 text-sm text-indigo-900">
              You listed your own vehicle{summary ? ` — ${summary}` : ""}
            </p>
          );
        })()}
        <h1 className="mt-2 text-2xl font-bold text-gray-950">{journey.route?.name ?? journey.route_id}</h1>
        <p className="mt-1 text-gray-800">{journey.departure_date}</p>
        <p className="mt-2 text-sm text-gray-800">
          Confirmed seats: {journey.total_passenger_count} / {journey.max_passengers}
        </p>
        <div className="mt-4">
          <JourneyHostActions journeyId={id} status={journey.status} />
        </div>
      </header>

      {selectedClaim && journey.van_booking_status === "awaiting_driver" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">Selected van offer</p>
          <p className="mt-1 text-sm text-amber-900">
            {selectedClaim.operators?.company_name} · {selectedClaim.vehicle_make}{" "}
            {selectedClaim.vehicle_model}
          </p>
          <p className="mt-2 text-sm font-bold text-amber-950">
            {vanBookingHostLabel(journey.van_booking_status)}
          </p>
        </section>
      )}

      {journey.van_booking_status !== "booked" && (
        <section>
          <h2 className="text-lg font-bold text-gray-950">Van offers</h2>
          <p className="mt-1 text-sm text-gray-700">
            Drivers can express interest in parallel with passenger matching. Select one van when ready.
          </p>
          {interests.length === 0 ? (
            <p className="mt-2 text-sm text-gray-700">No van offers yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {interests.map((o) => (
                <VanOfferRow key={o.id} journeyId={id} offer={o} />
              ))}
            </ul>
          )}
        </section>
      )}

      <VanBookingActions
        journeyId={id}
        vanBookingStatus={journey.van_booking_status}
        selectedClaim={selectedClaim}
      />

      <section>
        <h2 className="text-lg font-bold text-gray-950">Pending join requests</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-gray-700">No pending applications.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((p) => {
              const r = p as {
                id: string;
                name: string;
                email: string;
                passenger_count: number;
                pickup_location: string;
                dropoff_location: string;
              };
              return (
                <JoinRequestRow
                  key={r.id}
                  journeyId={id}
                  participantId={r.id}
                  applicantName={r.name}
                  passengerCount={r.passenger_count}
                  pickup={r.pickup_location}
                  dropoff={r.dropoff_location}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-950">Confirmed passengers</h2>
        {confirmed.length === 0 ? (
          <p className="mt-2 text-sm text-gray-700">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-gray-800">
            {(await Promise.all(
              (confirmed as DbJourneyParticipant[]).map(async (r) => {
                const threadId = r.contact_unlocked_at
                  ? await findPassengerThreadId(r.id)
                  : null;
                return { r, threadId };
              }),
            )).map(({ r, threadId }) => (
              <li key={r.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="font-semibold text-gray-950">{r.name}</p>
                <p>
                  {r.passenger_count} pax · {r.pickup_location} → {r.dropoff_location}
                </p>
                {r.agreed_price_per_seat_php != null && (
                  <p className="text-gray-800">
                    Agreed ₱{r.agreed_price_per_seat_php.toLocaleString("en-PH")}/seat
                  </p>
                )}
                {threadId && (
                  <Link
                    href={`/messages/${threadId}`}
                    className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
                  >
                    Open messages
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {declined.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-950">Declined requests</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {declined.map((p) => {
              const r = p as { id: string; name: string; passenger_count: number };
              return (
                <li key={r.id} className="rounded border border-gray-100 px-3 py-2">
                  {r.name} ({r.passenger_count} pax)
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
