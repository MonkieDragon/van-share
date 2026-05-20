"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFlightArrivalDisplay } from "@/lib/flightFormat";
import type { FlightStatus, FlightStatusLabel } from "@/lib/flightTypes";

type Props = {
  flightNumber: string;
  flightAirline: string | null;
  flightOriginIata: string | null;
  storedScheduledArrival: string | null;
  departureDate: string;
};

function statusClass(label: FlightStatusLabel): string {
  if (label === "On time") return "bg-emerald-100 text-emerald-950";
  if (label === "Delayed") return "bg-amber-100 text-amber-950";
  if (label === "Cancelled") return "bg-red-100 text-red-900";
  if (label === "Diverted") return "bg-orange-100 text-orange-950";
  return "bg-gray-100 text-gray-800";
}

export default function FlightStatusSection({
  flightNumber,
  flightAirline,
  flightOriginIata,
  storedScheduledArrival,
  departureDate,
}: Props) {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          flight: flightNumber,
          date: departureDate,
        });
        if (refresh) params.set("refresh", "1");
        const res = await fetch(`/api/flights/status?${params.toString()}`);
        const data = (await res.json()) as { status?: FlightStatus | null; available?: boolean };
        setAvailable(!!data.available);
        setStatus(data.status ?? null);
      } catch {
        setAvailable(false);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    },
    [flightNumber, departureDate],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const scheduled = status?.scheduledArrival ?? storedScheduledArrival;
  const estimated = status?.estimatedArrival;
  const label = status?.statusLabel ?? "Unknown";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-950">Flight status</h2>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(true)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh status"}
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-800">
        <span className="font-semibold text-gray-950">{flightNumber}</span>
        {flightAirline && <> · {flightAirline}</>}
        {flightOriginIata && <> · {flightOriginIata} → PPS</>}
      </p>
      <dl className="mt-4 grid gap-2 text-sm text-gray-800 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-gray-950">Scheduled arrival</dt>
          <dd>{formatFlightArrivalDisplay(scheduled)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-950">Estimated arrival</dt>
          <dd>{estimated ? formatFlightArrivalDisplay(estimated) : "—"}</dd>
        </div>
      </dl>
      <p className="mt-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass(label)}`}
        >
          {loading && !status ? "Loading…" : label}
        </span>
      </p>
      {!available && !loading && (
        <p className="mt-2 text-sm text-amber-800">Flight data unavailable</p>
      )}
    </section>
  );
}
