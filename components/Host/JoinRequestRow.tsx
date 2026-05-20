"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  journeyId: string;
  participantId: string;
  applicantName: string;
  passengerCount: number;
  pickup: string;
  dropoff: string;
};

export default function JoinRequestRow({
  journeyId,
  participantId,
  applicantName,
  passengerCount,
  pickup,
  dropoff,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (action: "contact" | "deny") => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}/applications/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string; threadId?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Update failed");
        return;
      }
      if (action === "contact" && data.threadId) {
        router.push(`/messages/${data.threadId}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-900">
      <p className="font-semibold text-gray-950">{applicantName}</p>
      <p className="mt-2">
        <span className="font-medium text-gray-950">Passengers:</span> {passengerCount}
      </p>
      <p className="mt-1">
        <span className="font-medium text-gray-950">Pickup:</span> {pickup}
      </p>
      <p className="mt-1">
        <span className="font-medium text-gray-950">Dropoff:</span> {dropoff}
      </p>
      <p className="mt-2 text-xs text-gray-600">Contact is free during beta.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void act("contact")}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Contact passenger
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void act("deny")}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {msg && <p className="mt-2 text-red-800">{msg}</p>}
    </li>
  );
}
