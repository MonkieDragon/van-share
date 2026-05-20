import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationActionBody, DbRoute } from "@/types/journey";
import { sendJoinApplicationResultToApplicant } from "@/lib/journeyEmails";
import { agreedSeatPriceForParticipant } from "@/lib/journeyPricing";
import { getOrCreatePassengerThread } from "@/lib/messaging";

type Ctx = { params: Promise<{ id: string; participantId: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const { id: journeyId, participantId } = await context.params;
    if (!journeyId || !participantId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ApplicationActionBody;
    const isContact = body.action === "contact" || body.action === "accept";
    if (!isContact && body.action !== "deny") {
      return NextResponse.json({ error: "action must be contact or deny" }, { status: 400 });
    }

    const svc = createServiceClient();

    const { data: journey, error: jErr } = await svc
      .from("journeys")
      .select("*, routes(*)")
      .eq("id", journeyId)
      .single();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    if ((journey as { host_user_id?: string | null }).host_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: participant, error: pErr } = await svc
      .from("journey_participants")
      .select("*")
      .eq("id", participantId)
      .eq("journey_id", journeyId)
      .single();

    if (pErr || !participant) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (participant.status !== "pending") {
      return NextResponse.json({ error: "Application is not pending" }, { status: 400 });
    }

    const route = (journey as { routes: DbRoute | null }).routes;

    if (body.action === "deny") {
      const { error: uErr } = await svc
        .from("journey_participants")
        .update({ status: "declined" })
        .eq("id", participantId);
      if (uErr) throw uErr;

      await sendJoinApplicationResultToApplicant(
        journey as never,
        route,
        participant.email as string,
        participant.name as string,
        false,
      );
      return NextResponse.json({ ok: true });
    }

    const current = journey.total_passenger_count as number;
    const max = journey.max_passengers as number;
    const pax = participant.passenger_count as number;
    if (current + pax > max) {
      return NextResponse.json({ error: "Not enough seats remaining" }, { status: 400 });
    }

    const counterpartyUserId = participant.user_id as string | null;
    if (!counterpartyUserId) {
      return NextResponse.json(
        { error: "Applicant must have an account to message" },
        { status: 400 },
      );
    }

    const nextTotal = current + pax;
    const nextStatus = nextTotal >= max ? "full" : "open";
    const now = new Date().toISOString();
    const agreedPrice = agreedSeatPriceForParticipant(
      {
        price_mode: journey.price_mode,
        price_per_seat_php: journey.price_per_seat_php,
        total_price_php: journey.total_price_php,
        host_transport_mode: journey.host_transport_mode,
        preferred_vehicle_type: journey.preferred_vehicle_type,
        host_vehicle_type: journey.host_vehicle_type,
        route,
      },
      nextTotal,
    );

    const { error: cErr } = await svc
      .from("journey_participants")
      .update({
        status: "confirmed",
        contact_unlocked_at: now,
        agreed_price_per_seat_php: agreedPrice,
      })
      .eq("id", participantId);
    if (cErr) throw cErr;

    const { error: jUpErr } = await svc
      .from("journeys")
      .update({
        total_passenger_count: nextTotal,
        status: nextStatus,
      })
      .eq("id", journeyId);
    if (jUpErr) throw jUpErr;

    const thread = await getOrCreatePassengerThread(
      journeyId,
      participantId,
      user.id,
      counterpartyUserId,
    );

    await sendJoinApplicationResultToApplicant(
      journey as never,
      route,
      participant.email as string,
      participant.name as string,
      true,
    );

    return NextResponse.json({ ok: true, threadId: thread.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
