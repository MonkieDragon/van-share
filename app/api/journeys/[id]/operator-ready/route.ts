import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing journey id" }, { status: 400 });
    }

    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { operator_ready?: boolean };
    if (typeof body.operator_ready !== "boolean") {
      return NextResponse.json({ error: "operator_ready must be true or false" }, { status: 400 });
    }

    const svc = createServiceClient();
    const { data: journey, error: jErr } = await svc
      .from("journeys")
      .select("id, host_user_id, listing_status, status")
      .eq("id", id)
      .maybeSingle();

    if (jErr || !journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    if (journey.host_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (journey.listing_status !== "submitted") {
      return NextResponse.json({ error: "Only published journeys can be updated" }, { status: 400 });
    }

    if (!["open", "full"].includes(journey.status as string)) {
      return NextResponse.json(
        { error: "Only open journeys can be marked for operators" },
        { status: 400 },
      );
    }

    const { error: uErr } = await svc
      .from("journeys")
      .update({ operator_ready: body.operator_ready })
      .eq("id", id);

    if (uErr) throw uErr;

    return NextResponse.json({ ok: true, operator_ready: body.operator_ready });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
