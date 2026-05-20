"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NATIONALITIES } from "@/lib/nationalities";
import { journeyFieldClass } from "@/components/UI/JourneyDatePicker";
import OperatorFleetSection from "@/components/Operator/OperatorFleetSection";
import type { DbOperator } from "@/types/journey";
import type { DbOperatorVehicle, DbProfile } from "@/types/operator";

type Props = {
  profile: DbProfile;
  operator: DbOperator | null;
  vehicles: DbOperatorVehicle[];
};

export default function ProfileForm({ profile, operator, vehicles }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [nationality, setNationality] = useState(profile.nationality ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const errors: string[] = [];
    if (displayName.trim().length < 2) {
      errors.push("Display name — must be at least 2 characters");
    }
    if (!nationality) {
      errors.push("Nationality — select from the list");
    }
    if (errors.length > 0) {
      setMsg(errors.join(" · "));
      setSaved(false);
      return;
    }
    setLoading(true);
    setMsg("");
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          nationality,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Could not save profile");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 text-gray-900">
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Your details</h2>
        <label className="block text-sm text-gray-800">
          Display name
          <input
            type="text"
            className={`${journeyFieldClass} mt-1`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="block text-sm text-gray-800">
          Nationality
          <select
            className={`${journeyFieldClass} mt-1`}
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void save()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
          {saved && <p className="text-sm font-semibold text-emerald-800">Saved.</p>}
        </div>
        {msg && <p className="text-sm text-red-800">{msg}</p>}
      </section>

      {operator && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Operator account</h2>
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-gray-950">Company:</span> {operator.company_name}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-semibold text-gray-950">Contact:</span> {operator.contact_name}
          </p>
          <p className="text-sm text-gray-700">{operator.email}</p>
        </section>
      )}

      {operator && <OperatorFleetSection vehicles={vehicles} />}
    </div>
  );
}
