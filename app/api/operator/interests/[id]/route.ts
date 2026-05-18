import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as { action?: string };
    if (body.action !== "withdraw") {
      return NextResponse.json({ error: "action must be withdraw" }, { status: 400 });
    }

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
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (cErr || !claim) {
      return NextResponse.json({ error: "Interest not found" }, { status: 404 });
    }

    if (claim.status !== "interested") {
      return NextResponse.json({ error: "Can only withdraw while interest is pending" }, { status: 400 });
    }

    const { error: uErr } = await svc
      .from("operator_claims")
      .update({ status: "withdrawn" })
      .eq("id", id);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
