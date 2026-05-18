import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabaseServer";
import { mapJourneyRow } from "@/lib/listPublicJourneys";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("route_id")?.trim();
    const datesParam = searchParams.get("dates")?.trim() ?? "";
    const passengers = Number(searchParams.get("passengers"));
    if (!routeId) {
      return NextResponse.json({ error: "route_id is required" }, { status: 400 });
    }
    const dates = datesParam
      .split(",")
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (dates.length === 0) {
      return NextResponse.json({ error: "dates is required" }, { status: 400 });
    }
    const pax = Number.isFinite(passengers) && passengers >= 1 ? Math.floor(passengers) : 1;

    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("journeys")
      .select("*, routes(*)")
      .eq("route_id", routeId)
      .in("departure_date", dates)
      .eq("listing_status", "submitted")
      .in("status", ["open", "full"]);

    if (error) throw error;

    const rows = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
    const withSeats = rows.filter((j) => j.max_passengers - j.total_passenger_count >= pax);
    const dateSet = new Set(withSeats.map((j) => j.departure_date));
    return NextResponse.json({ dates: [...dateSet] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
