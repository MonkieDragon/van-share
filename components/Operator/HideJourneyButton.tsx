"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  journeyId: string;
  returnHref?: string | null;
};

export default function HideJourneyButton({ journeyId, returnHref }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const hide = async () => {
    if (!window.confirm("Hide this journey? It will no longer appear in your browse or job lists.")) {
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/operator/journeys/${journeyId}/hide`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not hide journey");
        return;
      }
      router.push(returnHref?.trim() || "/");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not hide journey");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void hide()}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? "Hiding…" : "Hide journey"}
      </button>
      {msg && <p className="mt-2 text-sm text-red-800">{msg}</p>}
    </div>
  );
}
