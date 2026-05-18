import Link from "next/link";
import RateTripForm from "@/components/RateTripForm";
import { createServiceClient } from "@/lib/supabaseServer";
import { verifyReviewToken } from "@/lib/reviewToken";
import type { DbRoute } from "@/types/journey";

export const metadata = {
  title: "Rate your trip | Van Share",
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function RatePage({ searchParams }: Props) {
  const { token: rawToken } = await searchParams;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (!token) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-gray-900">
        <h1 className="text-xl font-bold text-gray-950">Rate your trip</h1>
        <p className="text-gray-800">This page needs a valid link from your email.</p>
        <Link href="/" className="text-sm font-semibold text-blue-700 underline">
          Home
        </Link>
      </div>
    );
  }

  const payload = verifyReviewToken(token);
  if (!payload) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-gray-900">
        <h1 className="text-xl font-bold text-gray-950">Link invalid or expired</h1>
        <p className="text-gray-800">Ask the operator to send a fresh review link, or contact support.</p>
        <Link href="/" className="text-sm font-semibold text-blue-700 underline">
          Home
        </Link>
      </div>
    );
  }

  const supabase = createServiceClient();

  const { data: participant, error: pErr } = await supabase
    .from("journey_participants")
    .select("id, journey_id, name, status")
    .eq("id", payload.participantId)
    .single();

  if (pErr || !participant || participant.journey_id !== payload.journeyId) {
    return (
      <div className="mx-auto max-w-lg text-gray-900">
        <h1 className="text-xl font-bold text-gray-950">Invalid review link</h1>
      </div>
    );
  }

  if (participant.status === "cancelled") {
    return (
      <div className="mx-auto max-w-lg text-gray-900">
        <h1 className="text-xl font-bold text-gray-950">Cannot submit review</h1>
        <p className="mt-2 text-gray-800">This participant record was cancelled.</p>
      </div>
    );
  }

  const { data: journey, error: jErr } = await supabase
    .from("journeys")
    .select("id, departure_date, status, route_id, routes(*)")
    .eq("id", payload.journeyId)
    .single();

  if (jErr || !journey) {
    return (
      <div className="mx-auto max-w-lg text-gray-900">
        <h1 className="text-xl font-bold text-gray-950">Journey not found</h1>
      </div>
    );
  }

  const { data: claim, error: cErr } = await supabase
    .from("operator_claims")
    .select("operator_id")
    .eq("journey_id", payload.journeyId)
    .in("status", ["driver_confirmed", "selected"])
    .maybeSingle();

  if (cErr || !claim || claim.operator_id !== payload.operatorId) {
    return (
      <div className="mx-auto max-w-lg text-gray-900">
        <h1 className="text-xl font-bold text-gray-950">Invalid review link</h1>
      </div>
    );
  }

  const j = journey as unknown as {
    route_id: string;
    routes: DbRoute | DbRoute[] | null;
  };
  const route = Array.isArray(j.routes) ? j.routes[0] ?? null : j.routes;
  const routeLabel = route?.name ?? j.route_id;

  return (
    <div className="mx-auto max-w-lg space-y-6 text-gray-900">
      <Link href="/" className="text-sm font-semibold text-blue-700 hover:underline">
        ← Home
      </Link>
      <h1 className="text-2xl font-bold text-gray-950">Rate your trip</h1>
      <RateTripForm
        token={token}
        routeLabel={routeLabel}
        departureDate={(journey as { departure_date: string }).departure_date}
        participantName={participant.name as string}
      />
    </div>
  );
}
