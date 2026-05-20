"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddOperatorVehicleForm from "@/components/Operator/AddOperatorVehicleForm";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OperatorVehicleInput } from "@/types/operator";

type SavedVehicle = OperatorVehicleInput & { key: string };

export default function OperatorRegistrationForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [vehicles, setVehicles] = useState<SavedVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      const meta = u.user_metadata as { full_name?: string; name?: string; company_name?: string } | undefined;
      const n = meta?.full_name || meta?.name;
      if (n) setContactName(n);
      if (meta?.company_name) setCompanyName(meta.company_name);
    });
  }, []);

  const addVehicleToList = async (vehicle: OperatorVehicleInput): Promise<boolean> => {
    setVehicles((list) => [...list, { ...vehicle, key: crypto.randomUUID() }]);
    return true;
  };

  const removeVehicle = (key: string) => {
    setVehicles((list) => list.filter((v) => v.key !== key));
  };

  const register = async () => {
    if (vehicles.length < 1) {
      setMsg("Add at least one vehicle before registering.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/operator/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName,
          vehicles: vehicles.map(({ key: _k, ...v }) => v),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Registration failed");
        return;
      }
      router.push("/operator/dashboard");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-8 pb-12 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Register as operator</h1>
        <p className="mt-1 text-sm text-gray-800">
          Add your fleet, then register to claim journeys on the platform. Your account switches from
          passenger to operator.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-gray-950">Business details</h2>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Company / trading name</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Contact name</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
        </label>
      </section>

      <AddOperatorVehicleForm
        fleetCount={vehicles.length}
        submitLabel="Save vehicle to list"
        onSave={addVehicleToList}
      />

      {vehicles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-950">Your vehicles ({vehicles.length})</h2>
          <ul className="space-y-2">
            {vehicles.map((v) => (
              <li
                key={v.key}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                <div>
                  <p className="font-semibold text-gray-950">{v.name}</p>
                  <p className="text-sm text-gray-800">
                    {v.make} {v.model} ({v.year}) · {v.seat_count} seats
                  </p>
                  <p className="text-sm text-gray-700">Plate: {v.license_plate}</p>
                  <p className="text-xs text-gray-600">{v.image_urls.length} photo(s)</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-red-700 hover:underline"
                  onClick={() => removeVehicle(v.key)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        disabled={loading || vehicles.length < 1}
        onClick={() => void register()}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Registering…" : "Register as operator"}
      </button>

      {msg && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
