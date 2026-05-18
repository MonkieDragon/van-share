import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DbRoute, JoinJourneyBody } from "@/types/journey";
import { isJourneyHostedByUser } from "@/lib/journeyHost";
import { sendJoinApplicationPendingToHost } from "@/lib/journeyEmails";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Ctx) {
  try {
    const { id: journeyId } = await context.params;
    if (!journeyId) {
      return NextResponse.json({ error: "Missing journey id" }, { status: 400 });
    }

    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as JoinJourneyBody;
    if (!body.name?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }
    const email = (user.email ?? body.email)?.trim();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const pax = Number(body.passenger_count);
    if (!Number.isFinite(pax) || pax < 1) {
      return NextResponse.json({ error: "passenger_count must be at least 1" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: journey, error: jErr } = await supabase
      .from("journeys")
      .select("*, routes(*)")
      .eq("id", journeyId)
      .single();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    if ((journey as { listing_status?: string }).listing_status !== "submitted") {
      return NextResponse.json({ error: "This journey is not open for join requests" }, { status: 400 });
    }

    if (journey.status !== "open") {
      return NextResponse.json({ error: "This journey is not accepting join requests" }, { status: 400 });
    }

    if (
      isJourneyHostedByUser(
        {
          host_user_id: (journey as { host_user_id?: string | null }).host_user_id ?? null,
          host_email: journey.host_email as string,
        },
        user,
      )
    ) {
      return NextResponse.json({ error: "You cannot join your own journey" }, { status: 400 });
    }

    const jRow = journey as {
      stop_mode?: string;
      pickup_stop_mode?: string;
      dropoff_stop_mode?: string;
      pickup_location: string;
      dropoff_location: string;
    };
    const legacy = jRow.stop_mode ?? "fixed";
    const pickupMode = jRow.pickup_stop_mode ?? legacy;
    const dropoffMode = jRow.dropoff_stop_mode ?? legacy;
    let pickup = body.pickup_location?.trim() ?? "";
    let dropoff = body.dropoff_location?.trim() ?? "";
    if (pickupMode === "fixed") {
      pickup = jRow.pickup_location;
    } else if (!pickup) {
      return NextResponse.json({ error: "Your pickup location is required" }, { status: 400 });
    }
    if (dropoffMode === "fixed") {
      dropoff = jRow.dropoff_location;
    } else if (!dropoff) {
      return NextResponse.json({ error: "Your dropoff location is required" }, { status: 400 });
    }

    const current = journey.total_passenger_count as number;
    const max = journey.max_passengers as number;
    if (current + pax > max) {
      return NextResponse.json(
        { error: `Only ${max - current} more passenger spots available` },
        { status: 400 },
      );
    }

    const { error: pErr } = await supabase.from("journey_participants").insert({
      journey_id: journeyId,
      name: body.name.trim(),
      email,
      phone: body.phone.trim(),
      pickup_location: pickup,
      dropoff_location: dropoff,
      passenger_count: pax,
      luggage_count: Math.max(0, Number(body.luggage_count) || 0),
      status: "pending",
      user_id: user.id,
    });

    if (pErr) throw pErr;

    const route = (journey as { routes: DbRoute | null }).routes;
    await sendJoinApplicationPendingToHost(
      journey as never,
      route,
      body.name.trim(),
      email,
      pax,
    );

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
