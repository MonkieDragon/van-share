import { createServiceClient } from "@/lib/supabaseServer";
import { mapJourneyRow } from "@/lib/listPublicJourneys";
import type { JourneyListItem } from "@/types/journey";

export type ClaimedJourneyRow = {
  journeys: Record<string, unknown> | Record<string, unknown>[] | null;
};

/** Journeys where this operator's van is booked (for review invites). */
export async function listOperatorClaimedJourneys(operatorId: string): Promise<JourneyListItem[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("operator_claims")
    .select("journeys(*, routes(*))")
    .eq("operator_id", operatorId)
    .in("status", ["driver_confirmed", "selected"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as ClaimedJourneyRow[];
  const items = rows
    .map((r) => {
      const raw = r.journeys;
      const j = Array.isArray(raw) ? raw[0] : raw;
      if (!j || typeof j !== "object") return null;
      const mapped = mapJourneyRow(j as Record<string, unknown>);
      if (mapped.van_booking_status !== "booked") return null;
      return mapped;
    })
    .filter((x): x is JourneyListItem => x != null);

  return items.sort((a, b) => (a.departure_date < b.departure_date ? 1 : -1));
}
