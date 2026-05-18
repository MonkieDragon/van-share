import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VanBookingActionBody } from "@/types/journey";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const { id: journeyId } = await context.params;
    const body = (await req.json()) as VanBookingActionBody;
    if (body.action !== "book" && body.action !== "decline") {
      return NextResponse.json({ error: "action must be book or decline" }, { status: 400 });
    }

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const svc = createServiceClient();
    const { data: journey, error: jErr } = await svc
      .from("journeys")
      .select("*")
      .eq("id", journeyId)
      .single();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }
    if ((journey as { host_user_id?: string }).host_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const selectedId = (journey as { selected_operator_claim_id?: string | null })
      .selected_operator_claim_id;
    if (!selectedId) {
      return NextResponse.json({ error: "No van offer selected" }, { status: 400 });
    }

    if (body.action === "book") {
      const { error: cErr } = await svc
        .from("operator_claims")
        .update({ status: "driver_confirmed" })
        .eq("id", selectedId)
        .in("status", ["selected", "driver_confirmed"]);
      if (cErr) throw cErr;

      const { error: jUpErr } = await svc
        .from("journeys")
        .update({ van_booking_status: "booked" })
        .eq("id", journeyId);
      if (jUpErr) throw jUpErr;

      return NextResponse.json({ ok: true, van_booking_status: "booked" });
    }

    await svc
      .from("operator_claims")
      .update({ status: "declined_by_host" })
      .eq("id", selectedId);

    await svc
      .from("operator_claims")
      .update({ status: "interested" })
      .eq("journey_id", journeyId)
      .eq("status", "not_selected");

    const { error: jUpErr } = await svc
      .from("journeys")
      .update({
        van_booking_status: "not_booked",
        selected_operator_claim_id: null,
      })
      .eq("id", journeyId);
    if (jUpErr) throw jUpErr;

    return NextResponse.json({ ok: true, van_booking_status: "not_booked" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
