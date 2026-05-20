import type { SelectedFlight } from "@/lib/flightTypes";

/** Flight fields persisted only when all four API-sourced values are present and valid. */
export type StoredFlightFields = {
  flight_number: string;
  flight_airline: string;
  flight_origin_iata: string;
  flight_scheduled_arrival: string;
};

type FlightBody = {
  flight_number?: string | null;
  flight_airline?: string | null;
  flight_origin_iata?: string | null;
  flight_scheduled_arrival?: string | null;
};

const FLIGHT_NUMBER_RE = /^[A-Z0-9]{2,8}$/;
const IATA_RE = /^[A-Z]{3}$/;

function normalizeFlightNumber(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function parseStoredFlightFields(body: FlightBody): StoredFlightFields | null {
  const flight_number = body.flight_number?.trim();
  const flight_airline = body.flight_airline?.trim();
  const flight_origin_iata = body.flight_origin_iata?.trim().toUpperCase();
  const flight_scheduled_arrival = body.flight_scheduled_arrival?.trim();

  const any =
    flight_number || flight_airline || flight_origin_iata || flight_scheduled_arrival;
  if (!any) return null;

  if (!flight_number || !flight_airline || !flight_origin_iata || !flight_scheduled_arrival) {
    return null;
  }

  const num = normalizeFlightNumber(flight_number);
  if (!FLIGHT_NUMBER_RE.test(num)) return null;
  if (!IATA_RE.test(flight_origin_iata)) return null;
  if (Number.isNaN(new Date(flight_scheduled_arrival).getTime())) return null;

  return {
    flight_number: num,
    flight_airline,
    flight_origin_iata,
    flight_scheduled_arrival,
  };
}

export function storedFlightFieldsFromSelection(
  flight: SelectedFlight | null | undefined,
): StoredFlightFields | null {
  if (!flight) return null;
  return parseStoredFlightFields({
    flight_number: flight.flightNumber,
    flight_airline: flight.airline,
    flight_origin_iata: flight.originIata,
    flight_scheduled_arrival: flight.scheduledArrival,
  });
}
