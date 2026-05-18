import { redirect } from "next/navigation";
import ClaimJourneyButton from "@/components/Operator/ClaimJourneyButton";
import OperatorFleetSection from "@/components/Operator/OperatorFleetSection";
import OperatorInterestActions from "@/components/Operator/OperatorInterestActions";
import SendReviewInvitesButton from "@/components/Operator/SendReviewInvitesButton";
import JourneyStatusBadges from "@/components/Journey/JourneyStatusBadges";
import { getAccountContext } from "@/lib/accountProfile";
import { defaultVanName } from "@/lib/defaultVanName";
import { listOperatorClaimedJourneys } from "@/lib/listOperatorClaimedJourneys";
import { listOperatorInterests, operatorInterestStatusLabel } from "@/lib/listOperatorInterests";
import { listOperatorAvailableJourneys } from "@/lib/listOperatorJourneys";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { DbOperatorVehicle, OperatorFleetVehicle } from "@/types/operator";
import type { JourneyListItem } from "@/types/journey";

export const metadata = {
  title: "Operator dashboard | Van Share",
};

function OpenJourneyCard({
  journey,
  fleet,
}: {
  journey: JourneyListItem;
  fleet: OperatorFleetVehicle[];
}) {
  const routeName = journey.route?.name ?? journey.route_id;
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <JourneyStatusBadges
            vanBookingStatus={journey.van_booking_status}
            passengerStatus={journey.status}
            departureDate={journey.departure_date}
          />
          <p className="mt-2 text-sm font-medium text-gray-700">{journey.departure_date}</p>
          <h3 className="text-lg font-bold text-gray-950">{routeName}</h3>
          <p className="mt-1 text-sm text-gray-800">
            {journey.total_passenger_count} / {journey.max_passengers} pax · Pickup:{" "}
            {journey.pickup_location}
          </p>
          <p className="text-sm text-gray-800">Host: {journey.host_name}</p>
        </div>
        <div className="shrink-0 border-t border-gray-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <ClaimJourneyButton
            journeyId={journey.id}
            minPassengerSeats={journey.total_passenger_count}
            maxVanSeats={journey.max_passengers}
            fleet={fleet}
          />
        </div>
      </div>
    </li>
  );
}

export default async function OperatorDashboardPage() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/operator/dashboard");

  const ctx = await getAccountContext(user.id);
  if (!ctx.isOperator || !ctx.operator) {
    redirect("/operator/register");
  }

  const operatorId = ctx.operator.id;
  let available: JourneyListItem[] = [];
  let interests: Awaited<ReturnType<typeof listOperatorInterests>> = [];
  let booked: Awaited<ReturnType<typeof listOperatorClaimedJourneys>> = [];
  let vehicles: DbOperatorVehicle[] = [];
  let error: string | null = null;

  try {
    available = await listOperatorAvailableJourneys();
    interests = await listOperatorInterests(operatorId);
    booked = await listOperatorClaimedJourneys(operatorId);
    const svc = createServiceClient();
    const { data: vRows, error: vErr } = await svc
      .from("operator_vehicles")
      .select("*")
      .eq("operator_id", operatorId)
      .order("created_at", { ascending: true });
    if (vErr) throw vErr;
    vehicles = ((vRows ?? []) as DbOperatorVehicle[]).map((v, i) => ({
      ...v,
      name: v.name?.trim() || defaultVanName(i),
    }));
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load operator data";
  }

  const fleet: OperatorFleetVehicle[] = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    seat_count: v.seat_count,
  }));

  return (
    <div className="space-y-8 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Operator dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-800">
          {ctx.operator.company_name} · Express interest on journeys that still need a van.
        </p>
      </div>

      <OperatorFleetSection vehicles={vehicles} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">Could not load dashboard</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {!error && (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-950">Open jobs</h2>
            <p className="text-sm text-gray-800">Journeys with no van booked yet.</p>
            {available.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-800">
                No open jobs right now.
              </p>
            ) : (
              <ul className="space-y-4">
                {available.map((j) => (
                  <OpenJourneyCard key={j.id} journey={j} fleet={fleet} />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-950">My interests</h2>
            {interests.length === 0 ? (
              <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-800">
                You have not expressed interest in any journeys yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {interests.map((row) => {
                  const routeName = row.journey.route?.name ?? row.journey.route_id;
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <p className="text-sm font-medium text-gray-700">{row.journey.departure_date}</p>
                      <p className="font-semibold text-gray-950">{routeName}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {operatorInterestStatusLabel(row.status)}
                      </p>
                      <div className="mt-3">
                        <OperatorInterestActions
                          claimId={row.id}
                          status={row.status}
                          journey={{
                            host_name: row.journey.host_name,
                            host_email: row.journey.host_email,
                            host_phone: row.journey.host_phone,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {booked.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-950">Booked vans</h2>
              <p className="max-w-2xl text-sm text-gray-800">
                After the travel date, send review links so passengers can rate your service.
              </p>
              <ul className="space-y-3">
                {booked.map((j) => {
                  const routeName = j.route?.name ?? j.route_id;
                  return (
                    <li
                      key={j.id}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-700">{j.departure_date}</p>
                        <p className="font-semibold text-gray-950">{routeName}</p>
                        <p className="text-sm text-gray-800">
                          {j.total_passenger_count} passengers · {j.pickup_location}
                        </p>
                      </div>
                      <SendReviewInvitesButton journeyId={j.id} departureDate={j.departure_date} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
