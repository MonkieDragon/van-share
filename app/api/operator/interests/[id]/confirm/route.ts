import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { claimJourneyEmbed } from "@/lib/operatorClaimEmbeds";
import { createServiceClient } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;

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
      .select(`*, ${claimJourneyEmbed}(*)`)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (cErr || !claim) {
      return NextResponse.json({ error: "Interest not found" }, { status: 404 });
    }

    if (claim.status !== "selected") {
      return NextResponse.json(
        { error: "You can only confirm after the host has selected your offer" },
        { status: 400 },
      );
    }

    const journey = claim.journeys as { selected_operator_claim_id?: string | null };
    if (journey?.selected_operator_claim_id !== id) {
      return NextResponse.json({ error: "This offer is not the selected van" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error: uErr } = await svc
      .from("operator_claims")
      .update({
        status: "driver_confirmed",
        contact_unlocked_at: now,
      })
      .eq("id", id);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, contact_unlocked_at: now });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
