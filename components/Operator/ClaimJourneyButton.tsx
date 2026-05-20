"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OperatorFleetVehicle } from "@/types/operator";

export type ExpressedInterest = {
  claimId: string;
  operator_vehicle_id: string | null;
  proposed_price_php: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_seat_count: number | null;
};

type Props = {
  journeyId: string;
  minPassengerSeats: number;
  maxVanSeats: number;
  fleet: OperatorFleetVehicle[];
  disabled?: boolean;
  expressedInterest?: ExpressedInterest | null;
};

export default function ClaimJourneyButton({
  journeyId,
  minPassengerSeats,
  maxVanSeats,
  fleet,
  disabled,
  expressedInterest,
}: Props) {
  const router = useRouter();
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
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send interest");
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async () => {
    if (!expressedInterest) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/operator/interests/${expressedInterest.claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not withdraw");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not withdraw");
    } finally {
      setLoading(false);
    }
  };

  if (expressedInterest) {
    const fleetVehicle = expressedInterest.operator_vehicle_id
      ? fleet.find((v) => v.id === expressedInterest.operator_vehicle_id)
      : undefined;
    const vehicleLabel = fleetVehicle
      ? fleetVehicle.name
      : [expressedInterest.vehicle_make, expressedInterest.vehicle_model].filter(Boolean).join(" ") ||
        "Your vehicle";
    const seatCount = fleetVehicle?.seat_count ?? expressedInterest.vehicle_seat_count;

    return (
      <div className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Interest expressed
        </p>
        <div className="text-sm text-gray-900">
          <p className="font-semibold text-gray-950">{vehicleLabel}</p>
          {fleetVehicle ? (
            <p className="text-gray-800">
              {fleetVehicle.make} {fleetVehicle.model}
              {seatCount != null ? ` · ${seatCount} seats` : ""}
            </p>
          ) : seatCount != null ? (
            <p className="text-gray-800">{seatCount} seats</p>
          ) : null}
        </div>
        <p className="text-sm text-gray-800">
          <span className="font-semibold text-gray-950">Proposed van price: </span>
          {expressedInterest.proposed_price_php != null
            ? `₱${expressedInterest.proposed_price_php.toLocaleString("en-PH")}`
            : "Not specified"}
        </p>
        <button
          type="button"
          onClick={() => void withdraw()}
          disabled={disabled || loading}
          className="w-fit rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Withdrawing…" : "Withdraw interest"}
        </button>
        {msg && <p className="text-sm text-red-800">{msg}</p>}
      </div>
    );
  }

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
