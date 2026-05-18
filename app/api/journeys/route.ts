import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient, createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreateJourneyBody, DbRoute, StopMode } from "@/types/journey";
import { sendJourneyCreatedEmail } from "@/lib/journeyEmails";
import { mapJourneyRow } from "@/lib/listPublicJourneys";

export async function GET() {
  try {
    const supabase = createPublicServerClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("journeys")
      .select("*, routes(*)")
      .eq("listing_status", "submitted")
      .in("status", ["open", "full"])
      .gte("departure_date", today)
      .order("departure_date", { ascending: true })
      .order("time_window_start", { ascending: true })
      .limit(100);

    if (error) throw error;
    const rows = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CreateJourneyBody;

    if (!body.route_id?.trim()) {
      return NextResponse.json({ error: "route_id is required" }, { status: 400 });
    }
    if (!body.departure_date || !body.time_window_start) {
      return NextResponse.json(
        { error: "departure_date and time_window_start are required" },
        { status: 400 },
      );
    }
    const hostEmail = (user.email ?? body.host_email?.trim() ?? "").trim();
    if (!hostEmail) {
      return NextResponse.json({ error: "Account email is required" }, { status: 400 });
    }
    if (!body.host_name?.trim() || !body.host_phone?.trim()) {
      return NextResponse.json({ error: "Host name and phone are required" }, { status: 400 });
    }

    const pickup_stop_mode: StopMode =
      body.pickup_stop_mode === "flexible" ? "flexible" : "fixed";
    const dropoff_stop_mode: StopMode =
      body.dropoff_stop_mode === "flexible" ? "flexible" : "fixed";
    const stop_mode: StopMode =
      pickup_stop_mode === "flexible" || dropoff_stop_mode === "flexible"
        ? "flexible"
        : body.stop_mode === "flexible"
          ? "flexible"
          : "fixed";
    if (!body.pickup_location?.trim() || !body.dropoff_location?.trim()) {
      return NextResponse.json({ error: "Pickup and dropoff are required" }, { status: 400 });
    }
    const hostCount = Number(body.host_passenger_count);
    const maxP = Number(body.max_passengers);
    if (!Number.isFinite(hostCount) || hostCount < 1) {
      return NextResponse.json({ error: "host_passenger_count must be at least 1" }, { status: 400 });
    }
    if (!Number.isFinite(maxP) || maxP < 2 || maxP > 20) {
      return NextResponse.json({ error: "max_passengers must be between 2 and 20" }, { status: 400 });
    }
    if (hostCount > maxP) {
      return NextResponse.json(
        { error: "host_passenger_count cannot exceed max_passengers" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const insertRow = {
      route_id: body.route_id.trim(),
      departure_date: body.departure_date,
      time_window_start: body.time_window_start,
      time_window_end: body.time_window_end?.trim() || null,
      host_name: body.host_name.trim(),
      host_email: hostEmail,
      host_phone: body.host_phone.trim(),
      pickup_location: body.pickup_location.trim(),
      pickup_lat: body.pickup_lat ?? null,
      pickup_lng: body.pickup_lng ?? null,
      dropoff_location: body.dropoff_location.trim(),
      dropoff_lat: body.dropoff_lat ?? null,
      dropoff_lng: body.dropoff_lng ?? null,
      host_passenger_count: hostCount,
      luggage_count: Math.max(0, Number(body.luggage_count) || 0),
      max_passengers: maxP,
      total_passenger_count: hostCount,
      status: "open" as const,
      notes: body.notes?.trim() || null,
      listing_status: "submitted" as const,
      stop_mode,
      pickup_stop_mode,
      dropoff_stop_mode,
      host_user_id: user.id,
    };

    const { data: journey, error } = await supabase
      .from("journeys")
      .insert(insertRow)
      .select("*, routes(*)")
      .single();

    if (error) throw error;

    const route = (journey as { routes: DbRoute | null }).routes;
    await sendJourneyCreatedEmail(journey as never, route);

    return NextResponse.json(mapJourneyRow(journey as Record<string, unknown>));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
