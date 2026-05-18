import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabaseServer";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthRange(year: number, month1to12: number) {
  const start = `${year}-${pad2(month1to12)}-01`;
  const lastDay = new Date(year, month1to12, 0).getDate();
  const end = `${year}-${pad2(month1to12)}-${pad2(lastDay)}`;
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("route_id")?.trim();
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    if (!routeId) {
      return NextResponse.json({ error: "route_id is required" }, { status: 400 });
    }
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "year and month (1-12) are required" }, { status: 400 });
    }

    const { start, end } = monthRange(year, month);
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("journeys")
      .select("departure_date")
      .eq("route_id", routeId)
      .eq("listing_status", "submitted")
      .in("status", ["open", "full"])
      .gte("departure_date", start)
      .lte("departure_date", end);

    if (error) throw error;

    const dates = [...new Set((data ?? []).map((r) => (r as { departure_date: string }).departure_date))];
    return NextResponse.json({ dates });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
