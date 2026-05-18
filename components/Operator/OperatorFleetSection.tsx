"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AddOperatorVehicleForm from "@/components/Operator/AddOperatorVehicleForm";
import type { DbOperatorVehicle, OperatorVehicleInput } from "@/types/operator";

type FleetVehicle = Pick<
  DbOperatorVehicle,
  "id" | "name" | "make" | "model" | "year" | "license_plate" | "seat_count" | "image_urls"
>;

type Props = {
  vehicles: FleetVehicle[];
};

export default function OperatorFleetSection({ vehicles }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

  const saveVehicle = async (vehicle: OperatorVehicleInput): Promise<boolean> => {
    const res = await fetch("/api/operator/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not add vehicle");
    }
    setShowAddForm(false);
    router.refresh();
    return true;
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-950">Your fleet</h2>
        <button
          type="button"
          onClick={() => setShowAddForm((open) => !open)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-900 hover:bg-gray-50 sm:text-sm"
        >
          {showAddForm ? "Cancel" : "Add vehicle"}
        </button>
      </div>

      {vehicles.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => {
            const photo = v.image_urls[0];
            return (
              <li
                key={v.id}
                className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-4">
                  <p className="font-semibold text-gray-950">{v.name}</p>
                  <p className="text-sm text-gray-800">
                    {v.make} {v.model} ({v.year})
                  </p>
                  <p className="text-sm text-gray-700">Plate: {v.license_plate}</p>
                  {v.seat_count != null && (
                    <p className="text-sm text-gray-700">{v.seat_count} seats</p>
                  )}
                </div>
                {photo ? (
                  <div className="relative w-24 shrink-0 self-stretch sm:w-28">
                    <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800">
          No vehicles yet. Press Add vehicle to register your first van.
        </p>
      )}

      {showAddForm && (
        <AddOperatorVehicleForm
          fleetCount={vehicles.length}
          submitLabel="Add to fleet"
          onSave={saveVehicle}
        />
      )}
    </section>
  );
}
