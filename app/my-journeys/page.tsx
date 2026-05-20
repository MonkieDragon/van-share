import Link from "next/link";
import { redirect } from "next/navigation";
import OperatorMyJourneysSections from "@/components/Operator/OperatorMyJourneysSections";
import JourneyStatusBadges from "@/components/Journey/JourneyStatusBadges";
import { getAccountContext } from "@/lib/accountProfile";
import { effectiveJourneyStatus } from "@/lib/journeyLifecycle";
import { findPassengerThreadId } from "@/lib/messaging";
import { listMyJoinApplications } from "@/lib/listMyJoinApplications";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapJourneyRow } from "@/lib/listPublicJourneys";

export const metadata = {
  title: "My journeys | Van Share",
};

function joinStatusLabel(status: "pending" | "confirmed" | "declined" | "cancelled") {
  if (status === "pending") return "Awaiting host";
  if (status === "confirmed") return "Confirmed";
  if (status === "declined") return "Declined";
  return "Cancelled";
}

function joinStatusClass(status: "pending" | "confirmed" | "declined" | "cancelled") {
  if (status === "pending") return "bg-amber-100 text-amber-950";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-950";
  if (status === "declined") return "bg-red-100 text-red-900";
  return "bg-gray-100 text-gray-700";
}

export default async function MyJourneysPage() {
  const auth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login?next=/my-journeys");

  const ctx = await getAccountContext(user.id);

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("journeys")
    .select("*, routes(*)")
    .eq("host_user_id", user.id)
    .eq("listing_status", "submitted")
    .order("departure_date", { ascending: false });

  if (error) throw error;

  const hosted = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
  const joined = await listMyJoinApplications(user.id, user.email ?? "");
  const joinedWithThreads = await Promise.all(
    joined.map(async (app) => ({
      app,
      threadId:
        app.status === "confirmed" ? await findPassengerThreadId(app.id) : null,
    })),
  );

  return (
    <div className="space-y-10 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">My journeys</h1>
        <p className="mt-1 text-sm text-gray-800">
          {ctx.isOperator
            ? "Trips you are coordinating as an operator, plus any you have posted or joined as a passenger."
            : "Journeys you have posted and trips you have asked to join."}
        </p>
      </div>

      {ctx.isOperator && ctx.operator && (
        <OperatorMyJourneysSections
          operatorId={ctx.operator.id}
          companyName={ctx.operator.company_name}
        />
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-950">Journeys you&apos;ve posted</h2>
        {hosted.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-800">
            You have not posted a journey yet.{" "}
            {!ctx.isOperator && (
              <>
                <Link href="/create-journey" className="font-semibold text-blue-700 underline">
                  Post one
                </Link>
                .
              </>
            )}
            {ctx.isOperator && "Passengers post journeys — browse the home page to find van jobs."}
          </p>
        ) : (
          <ul className="space-y-3">
            {hosted.map((j) => (
              <li
                key={j.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <JourneyStatusBadges
                    vanBookingStatus={j.van_booking_status}
                    passengerStatus={effectiveJourneyStatus(j.status, j.departure_date)}
                    departureDate={j.departure_date}
                    hostTransportMode={j.host_transport_mode}
                    hostHasOwnVehicle={j.host_has_own_vehicle}
                    hostVehicleType={j.host_vehicle_type}
                    hostVehicleSeatsOffered={j.host_vehicle_seats_offered}
                    hostVehicleMake={j.host_vehicle_make}
                    hostVehicleModel={j.host_vehicle_model}
                  />
                  <p className="mt-2 font-semibold text-gray-950">{j.route?.name ?? j.route_id}</p>
                  <p className="text-sm text-gray-800">{j.departure_date}</p>
                </div>
                <Link
                  href={`/my-journeys/${j.id}`}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Manage
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-950">Journeys you&apos;ve joined</h2>
        {joined.length === 0 ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-gray-800">
            You have not applied to join any journeys yet.{" "}
            <Link href="/" className="font-semibold text-blue-700 underline">
              Browse journeys
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {joinedWithThreads.map(({ app, threadId }) => (
              <li
                key={app.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${joinStatusClass(app.status)}`}
                  >
                    {joinStatusLabel(app.status)}
                  </span>
                  <p className="mt-2 font-semibold text-gray-950">
                    {app.journey.route?.name ?? app.journey.route_id}
                  </p>
                  <p className="text-sm text-gray-800">
                    {app.journey.departure_date} · {app.passenger_count} passenger
                    {app.passenger_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {threadId && (
                    <Link
                      href={`/messages/${threadId}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Messages
                    </Link>
                  )}
                  <Link
                    href={`/journeys/${app.journey.id}`}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    View journey
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
