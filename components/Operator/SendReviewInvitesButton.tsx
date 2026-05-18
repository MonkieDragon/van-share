"use client";

import { useMemo, useState } from "react";

type Props = {
  journeyId: string;
  departureDate: string;
};

export default function SendReviewInvitesButton({ journeyId, departureDate }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const canSend = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return departureDate <= today;
  }, [departureDate]);

  const send = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/operator/review-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journey_id: journeyId }),
      });
      const data = (await res.json()) as { error?: string; sent?: number };
      if (!res.ok) {
        setMsg(data.error ?? "Could not send invites");
        return;
      }
      setMsg(`Sent ${data.sent ?? 0} email(s).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={send}
        disabled={!canSend || loading}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Email review links to passengers"}
      </button>
      {!canSend && (
        <p className="max-w-xs text-right text-xs text-gray-600">
          Available on or after the departure date ({departureDate}).
        </p>
      )}
      {msg && <p className="text-right text-sm text-gray-800">{msg}</p>}
    </div>
  );
}
