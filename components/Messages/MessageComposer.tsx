"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  threadId: string;
};

export default function MessageComposer({ threadId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send");
        return;
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void send(e)} className="border-t border-gray-200 bg-white p-4">
      <label className="sr-only" htmlFor="message-body">
        Message
      </label>
      <textarea
        id="message-body"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a message…"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send"}
        </button>
        {error && <p className="text-sm text-red-800">{error}</p>}
      </div>
    </form>
  );
}
