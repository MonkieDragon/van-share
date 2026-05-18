"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OperatorReadyToggle({
  journeyId,
  operatorReady,
}: {
  journeyId: string;
  operatorReady: boolean;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(operatorReady);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const toggle = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}/operator-ready`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator_ready: !ready }),
      });
      const data = (await res.json()) as { error?: string; operator_ready?: boolean };
      if (!res.ok) {
        setMsg(data.error ?? "Could not update");
        return;
      }
      setReady(Boolean(data.operator_ready));
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">Operator availability</h2>
      <p className="mt-1 text-sm text-gray-800">
        {ready
          ? "Operators can see this journey as available to claim."
          : "Operators see this as new — awaiting passenger confirmation before they can claim."}
      </p>
      <p className="mt-2 text-sm font-medium text-gray-800">
        Status:{" "}
        <span className={ready ? "text-emerald-800" : "text-amber-800"}>
          {ready ? "Ready for operators" : "Awaiting passenger confirmation"}
        </span>
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void toggle()}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading
          ? "Updating…"
          : ready
            ? "Mark as not ready for operators"
            : "Mark ready for operators"}
      </button>
      {msg && <p className="mt-2 text-sm text-red-800">{msg}</p>}
    </div>
  );
}
