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
      .select("host_user_id")
      .eq("id", journeyId)
      .single();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }
    if (journey.host_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: claim, error: cErr } = await svc
      .from("operator_claims")
      .select("id, status")
      .eq("id", claimId)
      .eq("journey_id", journeyId)
      .single();

    if (cErr || !claim) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }
    if (claim.status !== "interested") {
      return NextResponse.json({ error: "Can only decline interested offers" }, { status: 400 });
    }

    const { error: uErr } = await svc
      .from("operator_claims")
      .update({ status: "declined_by_host" })
      .eq("id", claimId);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
