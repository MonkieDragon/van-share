"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OperatorClaimWithOperator, VanBookingStatus } from "@/types/journey";

type Props = {
  journeyId: string;
  vanBookingStatus: VanBookingStatus;
  selectedClaim: OperatorClaimWithOperator | null;
};

export default function VanBookingActions({ journeyId, vanBookingStatus, selectedClaim }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (action: "book" | "decline") => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}/van-booking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Action failed");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  if (vanBookingStatus === "booked") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950">
        Van booked
      </p>
    );
  }

  if (!selectedClaim || vanBookingStatus === "not_booked") {
    return null;
  }

  const driverConfirmed = selectedClaim.status === "driver_confirmed";

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="font-bold text-gray-950">Selected van</h3>
      <p className="text-sm text-gray-800">
        {selectedClaim.vehicle_make} {selectedClaim.vehicle_model} ·{" "}
        {selectedClaim.operators?.company_name}
      </p>
      <p className="text-sm text-gray-700">
        {vanBookingStatus === "awaiting_driver" && !driverConfirmed && (
          <>Awaiting driver confirmation</>
        )}
        {driverConfirmed && <>Driver confirmed — you should be in contact</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void act("book")}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Booked
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void act("decline")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          Declined
        </button>
      </div>
      {msg && <p className="text-sm text-red-800">{msg}</p>}
    </div>
  );
}
