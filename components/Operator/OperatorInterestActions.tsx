"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DbOperatorClaim } from "@/types/journey";
import { hostContactFields } from "@/lib/journeyContactVisibility";
import type { DbJourney } from "@/types/journey";

type Props = {
  claimId: string;
  status: DbOperatorClaim["status"];
  journey: Pick<DbJourney, "host_name" | "host_email">;
};

export default function OperatorInterestActions({ claimId, status, journey }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [contact, setContact] = useState<ReturnType<typeof hostContactFields> | null>(null);

  const confirm = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/operator/interests/${claimId}/confirm`, { method: "PATCH" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not confirm");
        return;
      }
      setContact(hostContactFields(journey));
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setLoading(false);
    }
  };

  const withdraw = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/operator/interests/${claimId}`, {
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

  if (status === "selected") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirm()}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "…" : "Confirm & view host contact"}
        </button>
        <p className="text-xs text-gray-600">Payment for contact unlock will be added later — free for now.</p>
        {msg && <p className="text-sm text-red-800">{msg}</p>}
      </div>
    );
  }

  if (status === "driver_confirmed") {
    const c = contact ?? hostContactFields(journey);
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-gray-900">
        <p className="font-semibold text-emerald-950">Host contact</p>
        <p>{c.name}</p>
        <p>{c.email}</p>
      </div>
    );
  }

  if (status === "interested") {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void withdraw()}
        className="text-sm font-semibold text-gray-700 hover:underline disabled:opacity-50"
      >
        Withdraw interest
      </button>
    );
  }

  if (status === "declined_by_host") {
    return (
      <p className="text-sm font-semibold text-red-800">Declined your offer</p>
    );
  }

  return null;
}
