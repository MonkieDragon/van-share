import { NextRequest, NextResponse } from "next/server";
import { ensureProfile } from "@/lib/accountProfile";
import { parseVehicleList } from "@/lib/operatorVehicles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { RegisterOperatorBody } from "@/types/operator";
import { isValidStoredPhone } from "@/lib/createJourneyFormErrors";

export async function POST(req: NextRequest) {
  try {
    const auth = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await auth.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as RegisterOperatorBody;
    const company_name = body.company_name?.trim() ?? "";
    const contact_name = body.contact_name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const email = (user.email ?? "").trim();

    if (!company_name || !contact_name) {
      return NextResponse.json({ error: "Company and contact name are required" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Account email is required" }, { status: 400 });
    }
    if (!isValidStoredPhone(phone)) {
      return NextResponse.json({ error: "A valid contact phone number is required" }, { status: 400 });
    }

    const vehicles = parseVehicleList(body.vehicles);
    if (!vehicles) {
      return NextResponse.json(
        { error: "Add at least one vehicle with make, model, year, plate, and 1–4 photos" },
        { status: 400 },
      );
    }

    const svc = createServiceClient();
    await ensureProfile(user.id);

    const { data: existingOp } = await svc.from("operators").select("id").eq("user_id", user.id).maybeSingle();
    if (existingOp) {
      return NextResponse.json({ error: "You are already registered as an operator" }, { status: 400 });
    }

    const { data: operator, error: opErr } = await svc
      .from("operators")
      .insert({
        company_name,
        contact_name,
        phone,
        email,
        verified: false,
        user_id: user.id,
        moderation_status: "active",
      })
      .select("*")
      .single();

    if (opErr) throw opErr;

    const vehicleRows = vehicles.map((v) => ({
      operator_id: operator.id,
      name: v.name,
      make: v.make,
      model: v.model,
      year: v.year,
      license_plate: v.license_plate,
      image_urls: v.image_urls,
      seat_count: v.seat_count,
    }));

    const { error: vErr } = await svc.from("operator_vehicles").insert(vehicleRows);
    if (vErr) {
      await svc.from("operators").delete().eq("id", operator.id);
      throw vErr;
    }

    const { error: pErr } = await svc
      .from("profiles")
      .update({ account_type: "operator", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (pErr) throw pErr;

    return NextResponse.json({ success: true, operator_id: operator.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
