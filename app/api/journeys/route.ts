import { NextRequest, NextResponse } from "next/server";
import { createPublicServerClient, createServiceClient } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  BOOKED_VEHICLE_TYPES,
  computeMaxPassengers,
  PREFERRED_VEHICLE_TYPES,
  transportToVanAndOwn,
} from "@/lib/journeyTransport";
import type { CreateJourneyBody, DbRoute, HostTransportMode, JourneyPriceMode, StopMode } from "@/types/journey";
import { sendJourneyCreatedEmail } from "@/lib/journeyEmails";
import { mapJourneyRow } from "@/lib/listPublicJourneys";
import { parseStoredFlightFields } from "@/lib/flightSelection";
import { isPassengerOnboardingComplete } from "@/lib/profileOnboarding";
import { getAccountContext } from "@/lib/accountProfile";

export async function GET() {
  try {
    const supabase = createPublicServerClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("journeys")
      .select("*, routes(*)")
      .eq("listing_status", "submitted")
      .in("status", ["open", "full"])
      .gte("departure_date", today)
      .order("departure_date", { ascending: true })
      .order("time_window_start", { ascending: true })
      .limit(100);

    if (error) throw error;
    const rows = (data ?? []).map((r) => mapJourneyRow(r as Record<string, unknown>));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getAccountContext(user.id);
    if (ctx.isOperator) {
      return NextResponse.json(
        { error: "Operator accounts cannot post journeys. Use a traveler account." },
        { status: 400 },
      );
    }
    if (!isPassengerOnboardingComplete(ctx.profile)) {
      return NextResponse.json(
        { error: "Complete your profile — display name and nationality required" },
        { status: 400 },
      );
    }

    const hostName = ctx.profile.display_name?.trim();
    if (!hostName) {
      return NextResponse.json(
        { error: "Complete your profile — display name required" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as CreateJourneyBody;

    if (!body.route_id?.trim()) {
      return NextResponse.json({ error: "Route — select origin and destination" }, { status: 400 });
    }
    if (!body.departure_date || !body.time_window_start) {
      return NextResponse.json({ error: "Date and departure time — required" }, { status: 400 });
    }
    const hostEmail = (user.email ?? "").trim();
    if (!hostEmail) {
      return NextResponse.json({ error: "Account email is required" }, { status: 400 });
    }

    const pickup_stop_mode: StopMode =
      body.pickup_stop_mode === "flexible" ? "flexible" : "fixed";
    const dropoff_stop_mode: StopMode =
      body.dropoff_stop_mode === "flexible" ? "flexible" : "fixed";
    const stop_mode: StopMode =
      pickup_stop_mode === "flexible" || dropoff_stop_mode === "flexible"
        ? "flexible"
        : body.stop_mode === "flexible"
          ? "flexible"
          : "fixed";
    if (!body.pickup_location?.trim() || !body.dropoff_location?.trim()) {
      return NextResponse.json({ error: "Pickup and dropoff — required" }, { status: 400 });
    }

    const hostCount = Number(body.host_passenger_count);
    if (!Number.isFinite(hostCount) || hostCount < 1) {
      return NextResponse.json({ error: "Your group — must be at least 1" }, { status: 400 });
    }

    const mode = body.host_transport_mode as HostTransportMode;
    if (!["needs_vehicle", "own_vehicle", "vehicle_booked"].includes(mode)) {
      return NextResponse.json({ error: "Your transport — select an option" }, { status: 400 });
    }

    let minVehicleSeats: number | null = null;
    let preferredVehicleType: string | null = null;
    let hostVehicleType: string | null = null;
    let hostVehicleSeats: number | null = null;
    let hostVehicleMake: string | null = null;
    let hostVehicleModel: string | null = null;

    if (mode === "needs_vehicle") {
      const shareWith = Number(body.min_vehicle_seats);
      if (!Number.isFinite(shareWith) || shareWith < 1) {
        return NextResponse.json(
          { error: "Your transport — maximum people to share with must be at least 1" },
          { status: 400 },
        );
      }
      minVehicleSeats = Math.floor(shareWith);
      const pref = body.preferred_vehicle_type;
      if (!pref || !PREFERRED_VEHICLE_TYPES.includes(pref)) {
        return NextResponse.json(
          { error: "Your transport — select a preferred vehicle type" },
          { status: 400 },
        );
      }
      preferredVehicleType = pref;
    } else {
      const type = body.host_vehicle_type;
      if (!type || !BOOKED_VEHICLE_TYPES.includes(type)) {
        return NextResponse.json({ error: "Your transport — select car or van" }, { status: 400 });
      }
      const emptySeats = Number(body.host_vehicle_seats_offered);
      if (!Number.isFinite(emptySeats) || emptySeats < 1 || emptySeats > 10) {
        return NextResponse.json(
          { error: "Your transport — empty seats available must be between 1 and 10" },
          { status: 400 },
        );
      }
      hostVehicleType = type;
      hostVehicleSeats = Math.floor(emptySeats);
      hostVehicleMake = body.host_vehicle_make?.trim() || null;
      hostVehicleModel = body.host_vehicle_model?.trim() || null;
    }

    const cabinBags = Math.max(0, Math.floor(Number(body.cabin_bags_count) || 0));
    const checkedBags = Math.max(0, Math.floor(Number(body.checked_bags_count) || 0));
    const { van_booking_status, host_has_own_vehicle } = transportToVanAndOwn(mode);
    const maxP = computeMaxPassengers({
      host_transport_mode: mode,
      host_passenger_count: hostCount,
      min_vehicle_seats: minVehicleSeats,
      host_vehicle_seats_offered: hostVehicleSeats,
    });

    const priceMode = body.price_mode as JourneyPriceMode;
    if (!priceMode || !["per_seat", "split_total"].includes(priceMode)) {
      return NextResponse.json({ error: "Price — select how to set the price" }, { status: 400 });
    }

    let pricePerSeat: number | null = null;
    let totalPrice: number | null = null;
    if (priceMode === "per_seat") {
      const seat = Math.round(Number(body.price_per_seat_php));
      if (!Number.isFinite(seat) || seat < 1) {
        return NextResponse.json(
          { error: "Price — enter a price per seat of at least ₱1" },
          { status: 400 },
        );
      }
      pricePerSeat = seat;
    } else {
      const total = Math.round(Number(body.total_price_php));
      if (!Number.isFinite(total) || total < 1) {
        return NextResponse.json(
          { error: "Price — enter a total price of at least ₱1" },
          { status: 400 },
        );
      }
      totalPrice = total;
    }

    const supabase = createServiceClient();
    const storedFlight = parseStoredFlightFields(body);
    const insertRow = {
      route_id: body.route_id.trim(),
      departure_date: body.departure_date,
      time_window_start: body.time_window_start,
      time_window_end: null,
      host_name: hostName,
      host_email: hostEmail,
      pickup_location: body.pickup_location.trim(),
      pickup_lat: body.pickup_lat ?? null,
      pickup_lng: body.pickup_lng ?? null,
      dropoff_location: body.dropoff_location.trim(),
      dropoff_lat: body.dropoff_lat ?? null,
      dropoff_lng: body.dropoff_lng ?? null,
      host_passenger_count: hostCount,
      luggage_count: cabinBags + checkedBags,
      cabin_bags_count: cabinBags,
      checked_bags_count: checkedBags,
      oversized_luggage: Boolean(body.oversized_luggage),
      have_pets: Boolean(body.have_pets),
      allow_pets: Boolean(body.allow_pets),
      max_passengers: maxP,
      total_passenger_count: hostCount,
      status: "open" as const,
      notes: body.notes?.trim() || null,
      listing_status: "submitted" as const,
      stop_mode,
      pickup_stop_mode,
      dropoff_stop_mode,
      host_user_id: user.id,
      host_transport_mode: mode,
      min_vehicle_seats: minVehicleSeats,
      preferred_vehicle_type: preferredVehicleType,
      host_has_own_vehicle,
      host_vehicle_type: hostVehicleType,
      host_vehicle_seats_offered: hostVehicleSeats,
      host_vehicle_make: hostVehicleMake,
      host_vehicle_model: hostVehicleModel,
      van_booking_status,
      price_mode: priceMode,
      price_per_seat_php: pricePerSeat,
      total_price_php: totalPrice,
      flight_number: storedFlight?.flight_number ?? null,
      flight_airline: storedFlight?.flight_airline ?? null,
      flight_origin_iata: storedFlight?.flight_origin_iata ?? null,
      flight_scheduled_arrival: storedFlight?.flight_scheduled_arrival ?? null,
    };

    const { data: journey, error } = await supabase
      .from("journeys")
      .insert(insertRow)
      .select("*, routes(*)")
      .single();

    if (error) throw error;

    const route = (journey as { routes: DbRoute | null }).routes;
    await sendJourneyCreatedEmail(journey as never, route);

    return NextResponse.json(mapJourneyRow(journey as Record<string, unknown>));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
