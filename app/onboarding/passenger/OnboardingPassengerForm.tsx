"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NATIONALITIES } from "@/lib/nationalities";
import { journeyFieldClass } from "@/components/UI/JourneyDatePicker";

export default function OnboardingPassengerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next")?.trim() || "/";
  const [displayName, setDisplayName] = useState("");
  const [nationality, setNationality] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          profile?: { display_name?: string | null; nationality?: string | null };
          onboardingComplete?: boolean;
        } | null) => {
          if (data?.profile?.display_name) setDisplayName(data.profile.display_name);
          if (data?.profile?.nationality) setNationality(data.profile.nationality);
          if (data?.onboardingComplete) {
            router.replace(next.startsWith("/") ? next : "/");
          }
        },
      );
  }, [router, next]);

  const submit = async () => {
    const errors: string[] = [];
    if (displayName.trim().length < 2) {
      errors.push("Display name — must be at least 2 characters");
    }
    if (!nationality) {
      errors.push("Nationality — select from the list");
    }
    if (errors.length > 0) {
      setMsg(errors.join(" · "));
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          nationality,
          complete_onboarding: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(typeof data.error === "string" ? data.error : "Could not save profile");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Your traveler profile</h1>
        <p className="mt-1 text-sm text-gray-800">
          This name appears when you post or join journeys.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Display name</span>
          <input
            className={`mt-1 ${journeyFieldClass} px-3 py-2`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="How others see you"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Nationality</span>
          <select
            className={`mt-1 ${journeyFieldClass} px-3 py-2`}
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
          >
            <option value="">Select…</option>
            {NATIONALITIES.map((n) => (
              <option key={n.code} value={n.code}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void submit()}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
        {msg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {msg.split(" · ").map((line) => (
              <p key={line} className="mt-1 first:mt-0">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
