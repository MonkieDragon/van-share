"use client";

import { useState } from "react";
import { defaultVanName } from "@/lib/defaultVanName";
import type { OperatorVehicleInput } from "@/types/operator";

type DraftVehicle = OperatorVehicleInput;

function emptyVehicle(fleetCount: number): DraftVehicle {
  return {
    name: defaultVanName(fleetCount),
    make: "",
    model: "",
    year: new Date().getFullYear(),
    license_plate: "",
    image_urls: [],
    seat_count: 14,
  };
}

function validateDraft(draft: DraftVehicle, fleetCount: number): OperatorVehicleInput | string {
  if (!draft.make.trim() || !draft.model.trim() || !draft.license_plate.trim()) {
    return "Enter make, model, and license plate for this vehicle.";
  }
  if (draft.image_urls.length < 1) {
    return "Add at least one photo for this vehicle.";
  }
  if (!Number.isFinite(draft.seat_count) || draft.seat_count < 2) {
    return "Enter a valid seat count (at least 2).";
  }
  const name = draft.name.trim() || defaultVanName(fleetCount);
  return {
    name,
    make: draft.make.trim(),
    model: draft.model.trim(),
    year: draft.year,
    license_plate: draft.license_plate.trim(),
    image_urls: draft.image_urls,
    seat_count: Math.round(draft.seat_count),
  };
}

type Props = {
  fleetCount: number;
  submitLabel?: string;
  onSave: (vehicle: OperatorVehicleInput) => Promise<boolean>;
  className?: string;
};

export default function AddOperatorVehicleForm({
  fleetCount,
  submitLabel = "Save vehicle",
  onSave,
  className = "",
}: Props) {
  const [draft, setDraft] = useState<DraftVehicle>(() => emptyVehicle(fleetCount));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const uploadPhoto = async (file: File) => {
    if (draft.image_urls.length >= 4) {
      setMsg("Maximum 4 photos per vehicle.");
      return;
    }
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/operator/vehicles/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setMsg(data.error ?? "Upload failed");
        return;
      }
      setDraft((d) => ({ ...d, image_urls: [...d.image_urls, data.url!] }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setMsg("");
    const parsed = validateDraft(draft, fleetCount);
    if (typeof parsed === "string") {
      setMsg(parsed);
      return;
    }
    setSaving(true);
    try {
      const ok = await onSave(parsed);
      if (!ok) {
        setMsg("Could not save vehicle. Try again.");
        return;
      }
      setDraft(emptyVehicle(fleetCount + 1));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={`space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
    >
      <h3 className="text-lg font-bold text-gray-950">Add a vehicle</h3>
      <label className="block text-sm">
        <span className="font-semibold text-gray-950">Vehicle name</span>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder={defaultVanName(fleetCount)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Make</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={draft.make}
            onChange={(e) => setDraft((d) => ({ ...d, make: e.target.value }))}
            placeholder="Toyota"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Model</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={draft.model}
            onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
            placeholder="Hiace"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Year</span>
          <input
            type="number"
            min={1980}
            max={2100}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={draft.year}
            onChange={(e) => setDraft((d) => ({ ...d, year: Number(e.target.value) }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">License plate</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={draft.license_plate}
            onChange={(e) => setDraft((d) => ({ ...d, license_plate: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-gray-950">Seats (including driver)</span>
          <input
            type="number"
            min={2}
            max={20}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={draft.seat_count}
            onChange={(e) => setDraft((d) => ({ ...d, seat_count: Number(e.target.value) }))}
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-950">Photos (1–4)</p>
        <p className="mt-1 text-xs text-gray-600">{draft.image_urls.length} of 4 added</p>
        <label className="mt-2 inline-block">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading || saving || draft.image_urls.length >= 4}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadPhoto(f);
              e.target.value = "";
            }}
          />
          <span
            className={`inline-flex rounded-lg border px-4 py-2 text-sm font-semibold ${
              uploading || saving || draft.image_urls.length >= 4
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
                : "cursor-pointer border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            {uploading ? "Uploading…" : "Add photo"}
          </span>
        </label>
        {draft.image_urls.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {draft.image_urls.map((url) => (
              <li key={url} className="relative h-16 w-16 overflow-hidden rounded border border-gray-200">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                  disabled={uploading || saving}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      image_urls: d.image_urls.filter((u) => u !== url),
                    }))
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={uploading || saving}
        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>

      {msg && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
          {msg}
        </p>
      )}
    </section>
  );
}
