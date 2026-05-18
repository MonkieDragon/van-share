import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JourneyHostActionBody } from "@/types/journey";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const { id: journeyId } = await context.params;
    const body = (await req.json()) as JourneyHostActionBody;
    if (body.action !== "cancel" && body.action !== "mark_full") {
      return NextResponse.json({ error: "action must be cancel or mark_full" }, { status: 400 });
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

    if (body.action === "cancel") {
      const { error: uErr } = await svc
        .from("journeys")
        .update({ status: "cancelled" })
        .eq("id", journeyId);
      if (uErr) throw uErr;

      await svc
        .from("operator_claims")
        .update({ status: "withdrawn" })
        .eq("journey_id", journeyId)
        .eq("status", "interested");

      return NextResponse.json({ ok: true, status: "cancelled" });
    }

    const { error: uErr } = await svc
      .from("journeys")
      .update({ status: "full" })
      .eq("id", journeyId);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, status: "full" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
