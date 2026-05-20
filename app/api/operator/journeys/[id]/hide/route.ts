import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { hideJourneyForOperator } from "@/lib/operatorHiddenJourneys";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

const BLOCKING_CLAIM_STATUSES = new Set([
  "interested",
  "selected",
  "driver_confirmed",
]);

export async function POST(_req: NextRequest, context: Ctx) {
  try {
    const { id: journeyId } = await context.params;

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
    const { data: claim } = await svc
      .from("operator_claims")
      .select("status")
      .eq("operator_id", operator.id)
      .eq("journey_id", journeyId)
      .maybeSingle();

    if (claim && BLOCKING_CLAIM_STATUSES.has(claim.status as string)) {
      return NextResponse.json(
        { error: "Withdraw your interest before hiding this journey" },
        { status: 400 },
      );
    }

    await hideJourneyForOperator(operator.id, journeyId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
