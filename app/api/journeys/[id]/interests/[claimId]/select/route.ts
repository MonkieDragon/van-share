import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string; claimId: string }> };

export async function PATCH(_req: NextRequest, context: Ctx) {
  try {
    const { id: journeyId, claimId } = await context.params;

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
    if ((journey as { van_booking_status?: string }).van_booking_status === "booked") {
      return NextResponse.json({ error: "Van is already booked" }, { status: 400 });
    }

    const { data: claim, error: cErr } = await svc
      .from("operator_claims")
      .select("*")
      .eq("id", claimId)
      .eq("journey_id", journeyId)
      .single();

    if (cErr || !claim) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    if (claim.status !== "interested") {
      return NextResponse.json({ error: "This offer is not available to select" }, { status: 400 });
    }

    await svc
      .from("operator_claims")
      .update({ status: "not_selected" })
      .eq("journey_id", journeyId)
      .eq("status", "interested")
      .neq("id", claimId);

    await svc.from("operator_claims").update({ status: "selected" }).eq("id", claimId);

    const { error: jUpErr } = await svc
      .from("journeys")
      .update({
        van_booking_status: "awaiting_driver",
        selected_operator_claim_id: claimId,
      })
      .eq("id", journeyId);
    if (jUpErr) throw jUpErr;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
