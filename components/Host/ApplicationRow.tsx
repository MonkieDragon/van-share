"use client";

import { useState } from "react";

type Props = {
  journeyId: string;
  participantId: string;
  applicantName: string;
  applicantEmail: string;
  passengerCount: number;
  pickup: string;
  dropoff: string;
};

export default function ApplicationRow({
  journeyId,
  participantId,
  applicantName,
  applicantEmail,
  passengerCount,
  pickup,
  dropoff,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (action: "accept" | "deny") => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}/applications/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Update failed");
        return;
      }
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-900">
      <p className="font-semibold text-gray-950">{applicantName}</p>
      <p className="text-gray-700">{applicantEmail}</p>
      <p className="mt-2">
        <span className="font-medium text-gray-950">Passengers:</span> {passengerCount}
      </p>
      <p className="mt-1">
        <span className="font-medium text-gray-950">Pickup:</span> {pickup}
      </p>
      <p className="mt-1">
        <span className="font-medium text-gray-950">Dropoff:</span> {dropoff}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void act("accept")}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Accept
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
