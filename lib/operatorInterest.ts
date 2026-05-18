import { createServiceClient } from "@/lib/supabaseServer";
import { getOperatorForUser } from "@/lib/accountProfile";
import { isAllowedVehiclePhotoUrl } from "@/lib/operatorVehicles";
import type { VanBookingStatus } from "@/types/journey";

export async function loadVehicleForOperator(operatorId: string, vehicleId: string) {
  const svc = createServiceClient();
  const { data: vehicle, error } = await svc
    .from("operator_vehicles")
    .select("*")
    .eq("id", vehicleId)
    .eq("operator_id", operatorId)
    .single();
  if (error || !vehicle) return null;
  return vehicle;
}

export function vehicleSnapshotFromRow(vehicle: {
  make: string;
  model: string;
  seat_count: number | null;
  image_urls: string[];
}) {
  const urls = (vehicle.image_urls ?? []).map((u) => u.trim()).filter(Boolean);
  if (!urls.every(isAllowedVehiclePhotoUrl)) return null;
  const seats = vehicle.seat_count;
  if (seats == null || seats < 2) return null;
  return {
    vehicle_make: vehicle.make.trim(),
    vehicle_model: vehicle.model.trim(),
    vehicle_seat_count: Math.round(seats),
    vehicle_image_urls: urls,
  };
}

export async function assertJourneyOpenForInterest(journeyId: string) {
  const svc = createServiceClient();
  const { data: journey, error } = await svc
    .from("journeys")
    .select("*")
    .eq("id", journeyId)
    .single();
  if (error || !journey) return { error: "Journey not found", status: 404 as const };
  if (journey.status === "cancelled") {
    return { error: "Journey is cancelled", status: 400 as const };
  }
  if (journey.status === "expired") {
    return { error: "Journey has expired", status: 400 as const };
  }
  if ((journey as { listing_status?: string }).listing_status !== "submitted") {
    return { error: "Journey is not published", status: 400 as const };
  }
  const van = (journey as { van_booking_status?: VanBookingStatus }).van_booking_status ?? "not_booked";
  if (van === "booked") {
    return { error: "Van is already booked for this journey", status: 400 as const };
  }
  return { journey };
}

export async function getOperatorIdForUser(userId: string) {
  const op = await getOperatorForUser(userId);
  if (!op) return null;
  return op.id;
}
