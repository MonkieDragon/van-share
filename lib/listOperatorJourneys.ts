import { createServiceClient } from "@/lib/supabaseServer";
import { mapJourneyRow } from "@/lib/listPublicJourneys";
import { filterOutHidden, listHiddenJourneyIds } from "@/lib/operatorHiddenJourneys";
import { todayYmd } from "@/lib/journeyLifecycle";
import type { JourneyListItem } from "@/types/journey";

async function listBaseOperatorJourneys(
  filter: {
    van_booking_status?: "not_booked";
    created_since?: string;
  },
  operatorId?: string,
): Promise<JourneyListItem[]> {
  const supabase = createServiceClient();
  const today = todayYmd();

  let q = supabase
    .from("journeys")
    .select("*, routes(*)")
    .eq("listing_status", "submitted")
    .in("status", ["open", "full"])
    .eq("van_booking_status", filter.van_booking_status ?? "not_booked")
    .gte("departure_date", today)
    .order("departure_date", { ascending: true })
    .order("time_window_start", { ascending: true })
    .limit(200);

  if (filter.created_since) {
    q = q.gte("created_at", filter.created_since);
  }

  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
  if (operatorId) {
    const hidden = new Set(await listHiddenJourneyIds(operatorId));
    rows = filterOutHidden(rows, hidden);
  }
  return rows;
}

/** Journeys where operators can express interest (van not booked). */
export async function listOperatorAvailableJourneys(operatorId?: string): Promise<JourneyListItem[]> {
  return listBaseOperatorJourneys({ van_booking_status: "not_booked" }, operatorId);
}

/** Recently posted journeys (same pool as available — kept for dashboard section). */
export async function listOperatorNewJourneysThisWeek(operatorId?: string): Promise<JourneyListItem[]> {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return listBaseOperatorJourneys(
    {
      van_booking_status: "not_booked",
      created_since: d.toISOString(),
    },
    operatorId,
  );
}
