"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OperatorClaimWithOperator } from "@/types/journey";
import type { DbOperatorVehicle } from "@/types/operator";

type Props = {
  journeyId: string;
  offer: OperatorClaimWithOperator & { operator_vehicles?: DbOperatorVehicle | null };
};

export default function VanOfferRow({ journeyId, offer }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"select" | "decline" | null>(null);
  const [msg, setMsg] = useState("");

  const vehicle = offer.operator_vehicles;
  const photo = vehicle?.image_urls?.[0] ?? offer.vehicle_image_urls?.[0];

  const select = async () => {
    setLoading("select");
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}/interests/${offer.id}/select`, {
        method: "PATCH",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not select");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not select");
    } finally {
      setLoading(null);
    }
  };

  const decline = async () => {
    setLoading("decline");
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}/interests/${offer.id}/decline`, {
        method: "PATCH",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not decline");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not decline");
    } finally {
      setLoading(null);
    }
  };

  return (
    <li className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
      {photo && (
        <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-950">
          {vehicle?.name ?? `${offer.vehicle_make} ${offer.vehicle_model}`}
        </p>
        <p className="text-sm text-gray-800">
          {offer.operators?.company_name} · {offer.vehicle_make} {offer.vehicle_model} ·{" "}
          {offer.vehicle_seat_count} seats
        </p>
        {offer.proposed_price_php != null && (
          <p className="text-sm text-gray-700">Proposed ₱{offer.proposed_price_php.toLocaleString("en-PH")}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void select()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading === "select" ? "…" : "Select this van"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void decline()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === "decline" ? "…" : "Decline"}
          </button>
        </div>
        {msg && <p className="mt-1 text-sm text-red-800">{msg}</p>}
      </div>
    </li>
  );
}
