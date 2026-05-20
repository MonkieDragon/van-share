import { isVanBooked } from "@/lib/journeyLifecycle";
import type { HostVehicleType, JourneyListItem } from "@/types/journey";

const TYPE_LABELS: Record<HostVehicleType, string> = {
  van: "Van",
  car: "Car",
  suv: "SUV",
  minibus: "Minibus",
  other: "Vehicle",
};

export function hostVehicleTypeLabel(type: HostVehicleType): string {
  return TYPE_LABELS[type];
}

export function formatHostVehicleSummary(journey: {
  host_transport_mode?: string;
  host_has_own_vehicle: boolean;
  host_vehicle_type: HostVehicleType | null;
  host_vehicle_seats_offered: number | null;
  host_vehicle_make: string | null;
  host_vehicle_model: string | null;
}): string | null {
  const hasVehicle =
    journey.host_transport_mode === "own_vehicle" ||
    journey.host_transport_mode === "vehicle_booked" ||
    journey.host_has_own_vehicle;
  if (!hasVehicle || !journey.host_vehicle_type) return null;
  const parts: string[] = [hostVehicleTypeLabel(journey.host_vehicle_type)];
  if (journey.host_vehicle_seats_offered != null) {
    const n = journey.host_vehicle_seats_offered;
    parts.push(`${n} empty seat${n === 1 ? "" : "s"} for joiners`);
  }
  const makeModel = [journey.host_vehicle_make, journey.host_vehicle_model]
    .filter((s) => s?.trim())
    .join(" ")
    .trim();
  if (makeModel) parts.push(makeModel);
  return parts.join(" · ");
}

function isJourneyVehicleBooked(journey: JourneyListItem): boolean {
  return (
    isVanBooked(journey.van_booking_status) ||
    journey.host_transport_mode === "own_vehicle" ||
    journey.host_transport_mode === "vehicle_booked"
  );
}

export function journeyCardVehicleLine(journey: JourneyListItem): {
  heading: "Vehicle Booked" | "Vehicle Not Booked";
  detail: string | null;
  selfDrive: boolean;
} {
  const booked = isJourneyVehicleBooked(journey);
  const selfDrive =
    journey.host_transport_mode === "own_vehicle" || journey.host_has_own_vehicle;

  return {
    heading: booked ? "Vehicle Booked" : "Vehicle Not Booked",
    detail: booked ? formatHostVehicleSummary(journey) : null,
    selfDrive: booked && selfDrive,
  };
}
