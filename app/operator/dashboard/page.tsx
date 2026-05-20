import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ClaimJourneyButton, { type ExpressedInterest } from "@/components/Operator/ClaimJourneyButton";
import OperatorFleetSection from "@/components/Operator/OperatorFleetSection";
import OperatorSelectedActions from "@/components/Operator/OperatorSelectedActions";
import SendReviewInvitesButton from "@/components/Operator/SendReviewInvitesButton";
import JourneyCard from "@/components/Journey/JourneyCard";
import { getAccountContext } from "@/lib/accountProfile";
import { defaultVanName } from "@/lib/defaultVanName";
import { findOperatorThreadId } from "@/lib/messaging";
import { listOperatorClaimedJourneys } from "@/lib/listOperatorClaimedJourneys";
import { listOperatorInterests, type OperatorInterestRow } from "@/lib/listOperatorInterests";
import { listOperatorAvailableJourneys } from "@/lib/listOperatorJourneys";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { DbOperatorVehicle, OperatorFleetVehicle } from "@/types/operator";
import type { JourneyListItem } from "@/types/journey";

export const metadata = {
  title: "Operator dashboard | Van Share",
};

function toExpressedInterest(row: OperatorInterestRow): ExpressedInterest {
  return {
    claimId: row.id,
    operator_vehicle_id: row.operator_vehicle_id,
    proposed_price_php: row.proposed_price_php,
    vehicle_make: row.vehicle_make,
    vehicle_model: row.vehicle_model,
    vehicle_seat_count: row.vehicle_seat_count,
  };
}

function OperatorJourneyListItem({
  journey,
  children,
  label,
}: {
  journey: JourneyListItem;
  children?: ReactNode;
  label?: string;
}) {
  const detailQuery = `return=${encodeURIComponent("/operator/dashboard")}`;
  return (
    <li className="space-y-3">
      {label && (
        <p className="text-sm font-semibold text-amber-950">{label}</p>
      )}
      <JourneyCard journey={journey} detailQuery={detailQuery} />
      {children && <div className="pl-1">{children}</div>}
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
  let interests: OperatorInterestRow[] = [];
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
    error =
      e instanceof Error
        ? e.message
        : typeof e === "object" &&
            e !== null &&
            "message" in e &&
            typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Could not load operator data";
  }

  const fleet: OperatorFleetVehicle[] = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    make: v.make,
    model: v.model,
    seat_count: v.seat_count,
  }));

  const availableIdSet = new Set(available.map((j) => j.id));
  const openInterests = interests.filter(
    (i) => i.status === "interested" && availableIdSet.has(i.journey.id),
  );
  const expressedElsewhere = interests.filter(
    (i) => i.status === "interested" && !availableIdSet.has(i.journey.id),
  );
  const selectedInterests = interests.filter((i) => i.status === "selected");

  const openWithoutInterest = available.filter(
    (j) => !interests.some((i) => i.journey.id === j.id && i.status === "interested"),
  );

  const selectedWithThreads = await Promise.all(
    selectedInterests.map(async (row) => ({
      row,
      threadId: await findOperatorThreadId(row.id),
    })),
  );

  return (
    <div className="space-y-8 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Operator dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-800">
          {ctx.operator.company_name} · Browse open jobs on the{" "}
          <Link href="/" className="font-semibold text-blue-700 underline">
            home page
          </Link>{" "}
          or express interest below.
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
                {openWithoutInterest.map((j) => (
                  <OperatorJourneyListItem key={j.id} journey={j}>
                    <ClaimJourneyButton
                      journeyId={j.id}
                      minPassengerSeats={j.total_passenger_count}
                      maxVanSeats={j.max_passengers}
                      fleet={fleet}
                    />
                  </OperatorJourneyListItem>
                ))}
                {openInterests.map((row) => (
                  <OperatorJourneyListItem
                    key={row.id}
                    journey={row.journey}
                    label="Awaiting response"
                  >
                    <ClaimJourneyButton
                      journeyId={row.journey.id}
                      minPassengerSeats={row.journey.total_passenger_count}
                      maxVanSeats={row.journey.max_passengers}
                      fleet={fleet}
                      disabled
                      expressedInterest={toExpressedInterest(row)}
                    />
                  </OperatorJourneyListItem>
                ))}
              </ul>
            )}
          </section>

          {expressedElsewhere.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-950">Expressed interest</h2>
              <p className="text-sm text-gray-800">Awaiting host response on these trips.</p>
              <ul className="space-y-4">
                {expressedElsewhere.map((row) => (
                  <OperatorJourneyListItem
                    key={row.id}
                    journey={row.journey}
                    label="Awaiting response"
                  />
                ))}
              </ul>
            </section>
          )}

          {selectedWithThreads.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-950">Accepted offer — awaiting your message</h2>
              <ul className="space-y-4">
                {selectedWithThreads.map(({ row, threadId }) => (
                  <OperatorJourneyListItem key={row.id} journey={row.journey}>
                    <OperatorSelectedActions claimId={row.id} threadId={threadId} />
                  </OperatorJourneyListItem>
                ))}
              </ul>
            </section>
          )}

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
