"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  claimId: string;
  threadId?: string | null;
};

export default function OperatorSelectedActions({ claimId, threadId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"message" | "cancel" | null>(null);
  const [msg, setMsg] = useState("");
  const [localThreadId, setLocalThreadId] = useState(threadId);

  const sendMessage = async () => {
    setLoading("message");
    setMsg("");
    try {
      const res = await fetch(`/api/operator/interests/${claimId}/send-message`, {
        method: "PATCH",
      });
      const data = (await res.json()) as { error?: string; threadId?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not open messages");
        return;
      }
      if (data.threadId) {
        setLocalThreadId(data.threadId);
        router.push(`/messages/${data.threadId}`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not open messages");
    } finally {
      setLoading(null);
    }
  };

  const cancelOffer = async () => {
    if (!window.confirm("Cancel this offer? The host will need to select another operator.")) return;
    setLoading("cancel");
    setMsg("");
    try {
      const res = await fetch(`/api/operator/interests/${claimId}/cancel`, { method: "PATCH" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not cancel");
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">Messaging is free during beta.</p>
      <div className="flex flex-wrap gap-2">
        {localThreadId ? (
          <Link
            href={`/messages/${localThreadId}`}
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Open messages
          </Link>
        ) : (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void sendMessage()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading === "message" ? "…" : "Send message"}
          </button>
        )}
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void cancelOffer()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === "cancel" ? "…" : "Cancel offer"}
        </button>
      </div>
      {msg && <p className="text-sm text-red-800">{msg}</p>}
    </div>
  );
}
