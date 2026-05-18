import type { JourneyStatus, VanBookingStatus } from "@/types/journey";

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isJourneyPastDeparture(departureDate: string, today = todayYmd()): boolean {
  return departureDate < today;
}

export function effectiveJourneyStatus(
  status: JourneyStatus,
  departureDate: string,
  today = todayYmd(),
): JourneyStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "expired" || isJourneyPastDeparture(departureDate, today)) return "expired";
  return status;
}

export function isVanBooked(vanBookingStatus: VanBookingStatus): boolean {
  return vanBookingStatus === "booked";
}

export function vanBookingBadgeLabel(vanBookingStatus: VanBookingStatus): "BOOKED" | "NOT BOOKED" {
  return vanBookingStatus === "booked" ? "BOOKED" : "NOT BOOKED";
}

export function passengerStatusLabel(status: JourneyStatus, departureDate: string): string {
  const effective = effectiveJourneyStatus(status, departureDate);
  if (effective === "open") return "Open";
  if (effective === "full") return "Full";
  if (effective === "cancelled") return "Cancelled";
  return "Expired";
}
