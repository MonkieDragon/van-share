/**
 * Per-person seat price and route total estimates for journeys.
 */
import type {
  HostTransportMode,
  HostVehicleType,
  JourneyPriceMode,
  PreferredVehicleType,
} from "@/types/journey";

/** Round estimated amounts up to the nearest ₱50. */
export function roundUpToNearestFifty(peso: number): number {
  if (!Number.isFinite(peso) || peso <= 0) return 50;
  return Math.ceil(peso / 50) * 50;
}

export function estimatedPricePerPersonPhp(
  typicalVanPricePhp: number,
  totalPassengerCount: number,
): number {
  if (totalPassengerCount < 1) return roundUpToNearestFifty(typicalVanPricePhp);
  return roundUpToNearestFifty(typicalVanPricePhp / totalPassengerCount);
}

export function vehicleKindForStoredJourney(journey: {
  host_transport_mode: HostTransportMode;
  preferred_vehicle_type: PreferredVehicleType | null;
  host_vehicle_type: HostVehicleType | null;
}): "van" | "car" {
  if (journey.host_transport_mode === "needs_vehicle") {
    return journey.preferred_vehicle_type === "car" ? "car" : "van";
  }
  return journey.host_vehicle_type === "car" ? "car" : "van";
}

export function estimatedTotalPriceForJourney(
  typicalVanPricePhp: number,
  typicalCarPricePhp: number,
  vehicleKind: "van" | "car",
): number {
  return vehicleKind === "car" ? typicalCarPricePhp : typicalVanPricePhp;
}

export function seatPricePerPersonPhp(journey: {
  price_mode: JourneyPriceMode;
  price_per_seat_php: number | null;
  total_price_php: number | null;
  max_passengers: number;
  host_transport_mode: HostTransportMode;
  preferred_vehicle_type: PreferredVehicleType | null;
  host_vehicle_type: HostVehicleType | null;
  route: { typical_van_price_php: number; typical_car_price_php?: number | null } | null;
}): number {
  if (journey.price_mode === "per_seat" && journey.price_per_seat_php != null) {
    return journey.price_per_seat_php;
  }

  const van = journey.route?.typical_van_price_php ?? 7000;
  const car = journey.route?.typical_car_price_php ?? 3500;
  const kind = vehicleKindForStoredJourney(journey);
  const total =
    journey.total_price_php ?? estimatedTotalPriceForJourney(van, car, kind);
  return roundUpToNearestFifty(total / Math.max(1, journey.max_passengers));
}

export function totalPriceBasisLabel(journey: {
  price_mode: JourneyPriceMode;
  total_price_php: number | null;
  host_transport_mode: HostTransportMode;
  preferred_vehicle_type: PreferredVehicleType | null;
  host_vehicle_type: HostVehicleType | null;
  route: { typical_van_price_php: number; typical_car_price_php?: number | null } | null;
}): string | null {
  if (journey.price_mode === "per_seat") return null;
  const van = journey.route?.typical_van_price_php ?? 7000;
  const car = journey.route?.typical_car_price_php ?? 3500;
  const kind = vehicleKindForStoredJourney(journey);
  const estimated = estimatedTotalPriceForJourney(van, car, kind);
  if (journey.total_price_php != null && journey.total_price_php !== estimated) {
    return "Custom total set by host";
  }
  if (journey.host_transport_mode === "needs_vehicle") {
    return `Estimated ${kind} charter for this route`;
  }
  return `Based on your ${kind} total`;
}

export function isFixedSeatPriceJourney(journey: {
  price_mode: JourneyPriceMode;
  price_per_seat_php: number | null;
}): boolean {
  return journey.price_mode === "per_seat" && journey.price_per_seat_php != null;
}

/** Short price line for journey cards (e.g. "₱1,200/seat" vs "est. ₱900/person"). */
/** Seat price locked in when host contacts a joiner (split uses occupied seats after confirm). */
export function agreedSeatPriceForParticipant(
  journey: {
    price_mode: JourneyPriceMode;
    price_per_seat_php: number | null;
    total_price_php: number | null;
    host_transport_mode: HostTransportMode;
    preferred_vehicle_type: PreferredVehicleType | null;
    host_vehicle_type: HostVehicleType | null;
    route: { typical_van_price_php: number; typical_car_price_php?: number | null } | null;
  },
  totalPassengerCountAfterConfirm: number,
): number {
  if (journey.price_mode === "per_seat" && journey.price_per_seat_php != null) {
    return journey.price_per_seat_php;
  }
  const van = journey.route?.typical_van_price_php ?? 7000;
  const car = journey.route?.typical_car_price_php ?? 3500;
  const kind = vehicleKindForStoredJourney(journey);
  const total =
    journey.total_price_php ?? estimatedTotalPriceForJourney(van, car, kind);
  const occupied = Math.max(1, totalPassengerCountAfterConfirm);
  return roundUpToNearestFifty(total / occupied);
}

export function formatJourneySeatPriceLabel(
  journey: {
    price_mode: JourneyPriceMode;
    price_per_seat_php: number | null;
    estimated_price_per_person_php: number;
  },
): string {
  const amount = journey.estimated_price_per_person_php.toLocaleString("en-PH");
  if (isFixedSeatPriceJourney(journey)) {
    return `₱${amount}/seat`;
  }
  return `est. ₱${amount}/person`;
}
