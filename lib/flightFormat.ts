import type { FlightOption } from "@/lib/flightTypes";

export function formatFlightArrivalDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatFlightOptionLine(f: FlightOption): string {
  const time = formatFlightArrivalDisplay(f.scheduledArrival);
  return `${f.flightNumber} · ${f.airline} · ${f.originIata} → ${f.destinationIata} · ${time}`;
}
