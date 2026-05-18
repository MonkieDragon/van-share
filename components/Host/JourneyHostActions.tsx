"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JourneyStatus } from "@/types/journey";

type Props = {
  journeyId: string;
  status: JourneyStatus;
};

export default function JourneyHostActions({ journeyId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const act = async (action: "cancel" | "mark_full") => {
    if (action === "cancel" && !confirm("Cancel this journey? This cannot be undone.")) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/journeys/${journeyId}`, {
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

  if (status === "cancelled" || status === "expired") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void act("mark_full")}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
        >
          Mark van full
        </button>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => void act("cancel")}
        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
      >
        Cancel journey
      </button>
      {msg && <p className="w-full text-sm text-red-800">{msg}</p>}
    </div>
  );
}
