import { NextRequest, NextResponse } from "next/server";
import { getAccountContext } from "@/lib/accountProfile";
import { filterOutHidden, listHiddenJourneyIds } from "@/lib/operatorHiddenJourneys";
import { createPublicServerClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapJourneyRow } from "@/lib/listPublicJourneys";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("route_id")?.trim();
    const date = searchParams.get("date")?.trim();
    if (!routeId) {
      return NextResponse.json({ error: "route_id is required" }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 });
    }
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

    let rows = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (user) {
      const ctx = await getAccountContext(user.id);
      if (ctx.operator) {
        const hidden = new Set(await listHiddenJourneyIds(ctx.operator.id));
        rows = filterOutHidden(rows, hidden);
      }
    }

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
