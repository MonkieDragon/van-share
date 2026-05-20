import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, context: Ctx) {
  try {
    const { id: claimId } = await context.params;

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const operator = await getOperatorForUser(user.id);
    if (!operator) {
      return NextResponse.json({ error: "Not an operator" }, { status: 403 });
    }

    const svc = createServiceClient();
    const { data: claim, error: cErr } = await svc
      .from("operator_claims")
      .select("*")
      .eq("id", claimId)
      .eq("operator_id", operator.id)
      .single();

    if (cErr || !claim) {
      return NextResponse.json({ error: "Interest not found" }, { status: 404 });
    }
    if (claim.status !== "selected") {
      return NextResponse.json({ error: "Can only cancel a selected offer" }, { status: 400 });
    }

    const journeyId = claim.journey_id as string;

    const { error: uErr } = await svc
      .from("operator_claims")
      .update({ status: "withdrawn" })
      .eq("id", claimId);
    if (uErr) throw uErr;

    const { data: journey } = await svc
      .from("journeys")
      .select("selected_operator_claim_id")
      .eq("id", journeyId)
      .single();

    if (journey?.selected_operator_claim_id === claimId) {
      const { error: jErr } = await svc
        .from("journeys")
        .update({
          van_booking_status: "not_booked",
          selected_operator_claim_id: null,
        })
        .eq("id", journeyId);
      if (jErr) throw jErr;
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
