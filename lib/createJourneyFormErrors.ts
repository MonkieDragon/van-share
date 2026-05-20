import { isValidGeocodePick } from "@/lib/validateGeocodePick";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { BOOKED_VEHICLE_TYPES, PREFERRED_VEHICLE_TYPES } from "@/lib/journeyTransport";
import type { BookedHostVehicleType, HostTransportMode, JourneyPriceMode, PreferredVehicleType } from "@/types/journey";

export type CreateJourneyFormState = {
  routeId: string | null;
  departureDate: string;
  timeStart: string;
  pickupPick: GeocodePick | null;
  dropoffPick: GeocodePick | null;
  hostPassengers: number;
  hostTransportMode: HostTransportMode;
  maxShareWith: number;
  preferredVehicleType: PreferredVehicleType;
  hostVehicleType: BookedHostVehicleType | "";
  emptySeatsForJoiners: number;
  hostVehicleMake: string;
  hostVehicleModel: string;
  priceMode: JourneyPriceMode;
  pricePerSeat: number;
  totalPrice: number;
  cabinBags: number;
  checkedBags: number;
  oversizedLuggage: boolean;
  havePets: boolean;
  allowPets: boolean;
};

export function collectCreateJourneyErrors(form: CreateJourneyFormState): string[] {
  const errors: string[] = [];
  if (!form.routeId) errors.push("Route — select origin and destination");
  if (!form.departureDate.trim()) errors.push("Travel date — required");
  if (!form.timeStart.trim()) errors.push("Departure time — required");
  if (!isValidGeocodePick(form.pickupPick)) {
    errors.push("Pickup — choose from suggestions");
  }
  if (!isValidGeocodePick(form.dropoffPick)) {
    errors.push("Dropoff — choose from suggestions");
  }
  if (!Number.isFinite(form.hostPassengers) || form.hostPassengers < 1) {
    errors.push("Your group — must be at least 1 traveler");
  }
  if (form.hostTransportMode === "needs_vehicle") {
    if (!Number.isFinite(form.maxShareWith) || form.maxShareWith < 1) {
      errors.push("Your transport — maximum people to share with must be at least 1");
    }
    if (!PREFERRED_VEHICLE_TYPES.includes(form.preferredVehicleType)) {
      errors.push("Your transport — select a preferred vehicle type");
    }
  } else {
    if (!form.hostVehicleType || !BOOKED_VEHICLE_TYPES.includes(form.hostVehicleType)) {
      errors.push("Your transport — select car or van");
    }
    if (
      !Number.isFinite(form.emptySeatsForJoiners) ||
      form.emptySeatsForJoiners < 1 ||
      form.emptySeatsForJoiners > 10
    ) {
      errors.push("Your transport — empty seats available must be between 1 and 10");
    }
  }
  if (!Number.isFinite(form.cabinBags) || form.cabinBags < 0) {
    errors.push("Luggage — cabin bags must be 0 or more");
  }
  if (!Number.isFinite(form.checkedBags) || form.checkedBags < 0) {
    errors.push("Luggage — checked bags must be 0 or more");
  }
  if (form.priceMode === "per_seat") {
    if (!Number.isFinite(form.pricePerSeat) || form.pricePerSeat < 1) {
      errors.push("Price — enter a price per seat of at least ₱1");
    }
  } else if (!Number.isFinite(form.totalPrice) || form.totalPrice < 1) {
    errors.push("Price — enter a total price of at least ₱1");
  }
  return errors;
}
