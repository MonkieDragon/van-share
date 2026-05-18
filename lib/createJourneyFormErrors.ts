import { isValidGeocodePick } from "@/lib/validateGeocodePick";
import type { GeocodePick } from "@/lib/geocodeTypes";
import {
  countryFromE164,
  inferChannelFromE164,
  isValidContactPhone,
} from "@/lib/phoneFormat";
import { PH_MOBILE } from "@/lib/phoneCountries";

export function isValidStoredPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed.startsWith("+")) return false;
  const channel = inferChannelFromE164(trimmed);
  const country = channel === "ph-local" ? PH_MOBILE : countryFromE164(trimmed);
  return isValidContactPhone(trimmed, channel, country);
}

export type CreateJourneyFormState = {
  routeId: string | null;
  departureDate: string;
  timeStart: string;
  hostName: string;
  hostPhone: string;
  pickupPick: GeocodePick | null;
  dropoffPick: GeocodePick | null;
  hostPassengers: number;
  maxPassengers: number;
};

export function collectCreateJourneyErrors(form: CreateJourneyFormState): string[] {
  const errors: string[] = [];
  if (!form.routeId) errors.push("Route — select origin and destination");
  if (!form.departureDate.trim()) errors.push("Travel date — required");
  if (!form.timeStart.trim()) errors.push("Departure time — required");
  if (!form.hostName.trim()) errors.push("Your name — required");
  if (!form.hostPhone.trim()) {
    errors.push("Contact number — required");
  } else if (!isValidStoredPhone(form.hostPhone)) {
    errors.push(
      "Contact number — enter a valid Philippine mobile (10 digits) or WhatsApp number with country code",
    );
  }
  if (!isValidGeocodePick(form.pickupPick)) {
    errors.push("Pickup address — choose from suggestions or tap Airport");
  }
  if (!isValidGeocodePick(form.dropoffPick)) {
    errors.push("Dropoff address — choose from suggestions");
  }
  if (!Number.isFinite(form.hostPassengers) || form.hostPassengers < 1) {
    errors.push("Your group — must be at least 1");
  }
  if (!Number.isFinite(form.maxPassengers) || form.maxPassengers < 2) {
    errors.push("Van capacity — must be at least 2");
  }
  if (form.hostPassengers > form.maxPassengers) {
    errors.push("Your group — cannot exceed van capacity");
  }
  return errors;
}
