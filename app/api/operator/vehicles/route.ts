import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import { parseVehicleInput } from "@/lib/operatorVehicles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { OperatorVehicleInput } from "@/types/operator";

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

    const operator = await getOperatorForUser(user.id);
    if (!operator) {
      return NextResponse.json({ error: "Register as an operator first" }, { status: 403 });
    }

    const body = (await req.json()) as OperatorVehicleInput;
    const vehicle = parseVehicleInput(body);
    if (!vehicle) {
      return NextResponse.json(
        { error: "Invalid vehicle: check name, make, model, year, plate, seats, and 1–4 photos" },
        { status: 400 },
      );
    }

    const svc = createServiceClient();
    const { data: row, error } = await svc
      .from("operator_vehicles")
      .insert({
        operator_id: operator.id,
        name: vehicle.name,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        license_plate: vehicle.license_plate,
        image_urls: vehicle.image_urls,
        seat_count: vehicle.seat_count,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, vehicle: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
