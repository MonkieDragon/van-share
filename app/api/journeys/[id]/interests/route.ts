import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OperatorClaimWithOperator } from "@/types/journey";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
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

    const { data, error } = await svc
      .from("operator_claims")
      .select("*, operators(*), operator_vehicles(*)")
      .eq("journey_id", journeyId)
      .eq("status", "interested")
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ interests: (data ?? []) as OperatorClaimWithOperator[] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
