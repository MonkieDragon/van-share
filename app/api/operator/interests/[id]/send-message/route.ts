import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { getOrCreateOperatorThread } from "@/lib/messaging";
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
      .select("*, journeys(id, host_user_id)")
      .eq("id", claimId)
      .eq("operator_id", operator.id)
      .single();

    if (cErr || !claim) {
      return NextResponse.json({ error: "Interest not found" }, { status: 404 });
    }
    if (claim.status !== "selected") {
      return NextResponse.json({ error: "Host must select your offer first" }, { status: 400 });
    }

    const journey = claim.journeys as { id: string; host_user_id: string };
    const now = new Date().toISOString();

    const { error: uErr } = await svc
      .from("operator_claims")
      .update({ contact_unlocked_at: now })
      .eq("id", claimId);
    if (uErr) throw uErr;

    const thread = await getOrCreateOperatorThread(
      claim.journey_id as string,
      claimId,
      journey.host_user_id,
      user.id,
    );

    return NextResponse.json({ ok: true, threadId: thread.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
