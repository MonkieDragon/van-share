import { NextResponse } from "next/server";
import { getAccountContext } from "@/lib/accountProfile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { DbOperatorVehicle } from "@/types/operator";

export async function GET() {
  try {
    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getAccountContext(user.id);
    let vehicles: DbOperatorVehicle[] = [];

    if (ctx.operator) {
      const svc = createServiceClient();
      const { data, error } = await svc
        .from("operator_vehicles")
        .select("*")
        .eq("operator_id", ctx.operator.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      vehicles = (data ?? []) as DbOperatorVehicle[];
    }

    return NextResponse.json({
      account_type: ctx.accountType,
      profile: ctx.profile,
      operator: ctx.operator,
      vehicles,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
