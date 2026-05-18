"use client";

import { useState } from "react";

type Props = {
  token: string;
  routeLabel: string;
  departureDate: string;
  participantName: string;
};

export default function RateTripForm({ token, routeLabel, departureDate, participantName }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (rating < 1 || rating > 10) {
      setMsg("Choose a rating from 1 to 10.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          review_text: reviewText.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not save review");
        return;
      }
      setDone(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <p className="font-semibold">Thank you for your feedback.</p>
        <p className="mt-2 text-sm">Your review helps other travelers choose quality transfers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm">
      <p className="text-sm text-gray-800">
        Hi <span className="font-semibold text-gray-950">{participantName}</span>, rate your trip on{" "}
        <span className="font-semibold text-gray-950">{routeLabel}</span> ({departureDate}).
      </p>

      <div>
        <p className="text-sm font-medium text-gray-800">Overall (out of 10)</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              disabled={loading}
              onClick={() => setRating(n)}
              className={`min-w-[2rem] rounded border px-2 py-1 text-sm font-bold transition ${
                rating === n
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-300 bg-white text-gray-800 hover:border-gray-400"
              } disabled:opacity-50`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm text-gray-800">
        Comment (optional)
        <textarea
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          rows={4}
          maxLength={2000}
          placeholder="Punctuality, vehicle condition, driving…"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          disabled={loading}
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit review"}
      </button>
      {msg && <p className="text-sm text-red-800">{msg}</p>}
    </div>
  );
}
