import { createServiceClient } from "@/lib/supabaseServer";
import { mapJourneyRow } from "@/lib/listPublicJourneys";
import type { JourneyListItem } from "@/types/journey";

export type MyJoinApplication = {
  id: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  passenger_count: number;
  created_at: string;
  journey: JourneyListItem;
};

export async function listMyJoinApplications(
  userId: string,
  userEmail: string,
): Promise<MyJoinApplication[]> {
  const svc = createServiceClient();
  const email = userEmail.trim().toLowerCase();

  const { data, error } = await svc
    .from("journey_participants")
    .select("id, status, passenger_count, created_at, user_id, email, journeys(*, routes(*))")
    .or(`user_id.eq.${userId},email.eq.${email}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const out: MyJoinApplication[] = [];
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const journeyRaw = r.journeys;
    if (!journeyRaw || typeof journeyRaw !== "object") continue;

    const journey = mapJourneyRow(journeyRaw as Record<string, unknown>);
    if (journey.listing_status !== "submitted") continue;
    if (journey.host_user_id === userId) continue;

    const status = r.status as string;
    if (status !== "pending" && status !== "confirmed" && status !== "declined" && status !== "cancelled") {
      continue;
    }

    out.push({
      id: r.id as string,
      status,
      passenger_count: r.passenger_count as number,
      created_at: r.created_at as string,
      journey,
    });
  }

  return out;
}
