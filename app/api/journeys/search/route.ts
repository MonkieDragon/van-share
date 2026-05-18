import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabaseServer";
import { mapJourneyRow } from "@/lib/listPublicJourneys";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("route_id")?.trim();
    const date = searchParams.get("date")?.trim();
    const passengers = Number(searchParams.get("passengers"));
    if (!routeId) {
      return NextResponse.json({ error: "route_id is required" }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 });
    }
    const pax = Number.isFinite(passengers) && passengers >= 1 ? Math.floor(passengers) : 1;

    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("journeys")
      .select("*, routes(*)")
      .eq("route_id", routeId)
      .eq("departure_date", date)
      .eq("listing_status", "submitted")
      .in("status", ["open", "full"])
      .order("time_window_start", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
    const filtered = rows.filter((j) => j.max_passengers - j.total_passenger_count >= pax);
    return NextResponse.json(filtered);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
