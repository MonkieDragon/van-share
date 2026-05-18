"use client";

import { useMemo, useState } from "react";
import type { OperatorFleetVehicle } from "@/types/operator";

type Props = {
  journeyId: string;
  minPassengerSeats: number;
  maxVanSeats: number;
  fleet: OperatorFleetVehicle[];
  disabled?: boolean;
};

export default function ClaimJourneyButton({
  journeyId,
  minPassengerSeats,
  maxVanSeats,
  fleet,
  disabled,
}: Props) {
  const eligible = useMemo(
    () =>
      fleet.filter(
        (v) => v.seat_count != null && v.seat_count >= minPassengerSeats && v.seat_count <= maxVanSeats,
      ),
    [fleet, minPassengerSeats, maxVanSeats],
  );

  const [selectedId, setSelectedId] = useState(() => eligible[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const selected = eligible.find((v) => v.id === selectedId) ?? eligible[0];

  const claim = async () => {
    if (!selected) {
      setMsg("No vehicle in your fleet meets this journey's seat requirements.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const proposed_price_php =
        price.trim() === "" ? null : Math.round(Number(price));
      if (price.trim() !== "" && !Number.isFinite(proposed_price_php)) {
        setMsg("Enter a valid price or leave blank");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/operator/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journey_id: journeyId,
          operator_vehicle_id: selected.id,
          proposed_price_php,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not send interest");
        return;
      }
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send interest");
    } finally {
      setLoading(false);
    }
  };

  if (fleet.length === 0) {
    return (
      <p className="max-w-xs text-sm text-amber-900">
        Add vehicles to your fleet before expressing interest.
      </p>
    );
  }

  if (eligible.length === 0) {
    return (
      <p className="max-w-xs text-sm text-amber-900">
        None of your fleet vehicles have {minPassengerSeats}–{maxVanSeats} seats for this journey.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Vehicle for this trip</p>

      {eligible.length === 1 && selected ? (
        <div className="text-sm text-gray-900">
          <p className="font-semibold text-gray-950">{selected.name}</p>
          <p className="text-gray-800">
            {selected.make} {selected.model} · {selected.seat_count} seats
          </p>
        </div>
      ) : (
        <label className="text-sm text-gray-800">
          Select vehicle
          <select
            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={disabled || loading}
          >
            {eligible.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.make} {v.model} ({v.seat_count} seats)
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="number"
          min={0}
          placeholder="Proposed van price (₱)"
          className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 sm:max-w-[200px]"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={disabled || loading}
        />
        <button
          type="button"
          onClick={claim}
          disabled={disabled || loading}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Express interest"}
        </button>
      </div>
      {msg && <p className="text-sm text-red-800">{msg}</p>}
    </div>
  );
}
