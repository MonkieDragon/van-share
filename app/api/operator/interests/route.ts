import { NextRequest, NextResponse } from "next/server";
import { getOperatorForUser } from "@/lib/accountProfile";
import {
  assertJourneyOpenForInterest,
  loadVehicleForOperator,
  vehicleSnapshotFromRow,
} from "@/lib/operatorInterest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabaseServer";
import type { ExpressInterestBody } from "@/types/journey";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExpressInterestBody;
    if (!body.journey_id) {
      return NextResponse.json({ error: "journey_id is required" }, { status: 400 });
    }
    const vehicleId =
      typeof body.operator_vehicle_id === "string" ? body.operator_vehicle_id.trim() : "";
    if (!vehicleId) {
      return NextResponse.json({ error: "operator_vehicle_id is required" }, { status: 400 });
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
      return NextResponse.json({ error: "Register as an operator first" }, { status: 403 });
    }

    const mod = operator.moderation_status ?? "active";
    if (mod === "suspended") {
      return NextResponse.json({ error: "This operator account cannot express interest" }, { status: 403 });
    }

    const check = await assertJourneyOpenForInterest(body.journey_id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    const journey = check.journey;

    const vehicle = await loadVehicleForOperator(operator.id, vehicleId);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found in your fleet" }, { status: 404 });
    }

    const snapshot = vehicleSnapshotFromRow(vehicle as never);
    if (!snapshot) {
      return NextResponse.json({ error: "Fleet vehicle is invalid" }, { status: 400 });
    }

    const totalPax = journey.total_passenger_count as number;
    const maxPax = journey.max_passengers as number;
    if (snapshot.vehicle_seat_count < totalPax) {
      return NextResponse.json(
        { error: `Vehicle must have at least ${totalPax} seats for current passengers` },
        { status: 400 },
      );
    }
    if (snapshot.vehicle_seat_count > maxPax) {
      return NextResponse.json(
        { error: `Vehicle seat count must not exceed journey capacity (${maxPax})` },
        { status: 400 },
      );
    }

    const proposed =
      body.proposed_price_php != null && Number.isFinite(Number(body.proposed_price_php))
        ? Math.round(Number(body.proposed_price_php))
        : null;

    const svc = createServiceClient();
    const { data: row, error: cErr } = await svc
      .from("operator_claims")
      .insert({
        operator_id: operator.id,
        journey_id: body.journey_id,
        operator_vehicle_id: vehicleId,
        proposed_price_php: proposed,
        status: "interested",
        ...snapshot,
      })
      .select("*")
      .single();

    if (cErr) {
      if (cErr.code === "23505") {
        return NextResponse.json({ error: "You already expressed interest in this journey" }, { status: 400 });
      }
      throw cErr;
    }

    return NextResponse.json({ success: true, interest: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
