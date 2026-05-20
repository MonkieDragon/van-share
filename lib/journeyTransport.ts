import type {
  BookedHostVehicleType,
  HostTransportMode,
  PreferredVehicleType,
  VanBookingStatus,
} from "@/types/journey";

export function transportToVanAndOwn(mode: HostTransportMode): {
  van_booking_status: VanBookingStatus;
  host_has_own_vehicle: boolean;
} {
  switch (mode) {
    case "own_vehicle":
      return { van_booking_status: "booked", host_has_own_vehicle: true };
    case "vehicle_booked":
      return { van_booking_status: "booked", host_has_own_vehicle: false };
    default:
      return { van_booking_status: "not_booked", host_has_own_vehicle: false };
  }
}

export function computeMaxPassengers(opts: {
  host_transport_mode: HostTransportMode;
  host_passenger_count: number;
  min_vehicle_seats: number | null;
  host_vehicle_seats_offered: number | null;
}): number {
  const { host_transport_mode, host_passenger_count, min_vehicle_seats, host_vehicle_seats_offered } =
    opts;
  if (host_transport_mode === "needs_vehicle") {
    const shareWith = min_vehicle_seats ?? 8;
    return host_passenger_count + Math.max(1, shareWith);
  }
  const emptySeats = host_vehicle_seats_offered ?? 1;
  return host_passenger_count + Math.max(1, emptySeats);
}

export const PREFERRED_VEHICLE_TYPES: PreferredVehicleType[] = ["van", "car", "dont_mind"];

export function formatLuggageSummary(journey: {
  cabin_bags_count: number;
  checked_bags_count: number;
  oversized_luggage: boolean;
  luggage_count?: number;
}): string | null {
  const cabin = journey.cabin_bags_count ?? 0;
  const checked = journey.checked_bags_count ?? 0;
  const total = cabin + checked;
  if (total === 0 && !journey.oversized_luggage) {
    const legacy = journey.luggage_count ?? 0;
    if (legacy > 0) return `${legacy} bag${legacy === 1 ? "" : "s"}`;
    return null;
  }
  const parts: string[] = [];
  if (cabin > 0) parts.push(`${cabin} cabin`);
  if (checked > 0) parts.push(`${checked} checked`);
  if (journey.oversized_luggage) parts.push("oversized");
  return parts.join(" · ");
}

export const BOOKED_VEHICLE_TYPES: BookedHostVehicleType[] = ["van", "car"];
