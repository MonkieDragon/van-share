"use client";

import { useCallback, useEffect, useId, useState } from "react";
import useSWR from "swr";
import type { AddressPreset } from "@/lib/addressPresets";
import type { AddressLeg } from "@/lib/routeAddressLabels";
import type { GeocodePick } from "@/lib/geocodeTypes";
import { isValidGeocodePick } from "@/lib/validateGeocodePick";

export type { GeocodePick };

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  label: string;
  placeholder?: string;
  routeId?: string | null;
  leg?: AddressLeg;
  presets?: AddressPreset[];
  onPick: (pick: GeocodePick) => void;
  onClear?: () => void;
  onValidatedChange?: (valid: boolean, pick: GeocodePick | null) => void;
  className?: string;
};

const fetcher = async (url: string): Promise<Suggestion[]> => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export default function GeocodeAddressInput({
  label,
  placeholder = "Start typing an address…",
  routeId,
  leg,
  presets = [],
  onPick,
  onClear,
  onValidatedChange,
  className = "",
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [validatedPick, setValidatedPick] = useState<GeocodePick | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const awaitingSelection = debounced.length >= 3 && !validatedPick;
  const legParam = leg ? `&leg=${encodeURIComponent(leg)}` : "";
  const searchUrl = awaitingSelection
    ? `/api/geocode/search?q=${encodeURIComponent(debounced)}${routeId ? `&route_id=${encodeURIComponent(routeId)}` : ""}${legParam}`
    : null;

  const { data: suggestions, isLoading } = useSWR<Suggestion[]>(searchUrl, fetcher, {
    dedupingInterval: 1500,
    revalidateOnFocus: false,
  });

  const applyValidated = useCallback(
    (pick: GeocodePick | null, presetId: string | null) => {
      setValidatedPick(pick);
      setSelectedPresetId(presetId);
      const valid = isValidGeocodePick(pick);
      onValidatedChange?.(valid, pick);
      if (valid && pick) onPick(pick);
    },
    [onPick, onValidatedChange],
  );

  const handleSelect = (s: Suggestion) => {
    const pick: GeocodePick = {
      displayName: s.display_name,
      lat: parseFloat(s.lat),
      lng: parseFloat(s.lon),
    };
    setQuery(s.display_name);
    setOpen(false);
    applyValidated(pick, null);
  };

  const handlePreset = (preset: AddressPreset) => {
    setQuery(preset.pick.displayName);
    setOpen(false);
    applyValidated(preset.pick, preset.id);
  };

  const invalidate = () => {
    setValidatedPick(null);
    setSelectedPresetId(null);
    onValidatedChange?.(false, null);
    onClear?.();
  };

  const showInvalid =
    touched && query.trim().length > 0 && !isValidGeocodePick(validatedPick);

  return (
    <div className={`relative w-full ${className}`}>
      <label htmlFor={listId} className="mb-0.5 block text-xs font-semibold text-gray-700">
        {label}
      </label>
      {presets.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {presets.map((preset) => {
            const selected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
      <input
        id={listId}
        type="text"
        className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm ${
          showInvalid ? "border-red-500 ring-1 ring-red-200" : "border-gray-300"
        }`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          if (validatedPick || selectedPresetId) {
            invalidate();
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTouched(true);
          setTimeout(() => setOpen(false), 180);
        }}
        autoComplete="off"
        aria-invalid={showInvalid}
        aria-describedby={showInvalid ? `${listId}-err` : undefined}
      />
      {showInvalid && (
        <p id={`${listId}-err`} className="mt-1 text-xs text-red-700">
          Choose a suggestion from the list or a preset so we can place it on the map.
        </p>
      )}
      {open && awaitingSelection && (
        <ul
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
          role="listbox"
        >
          {isLoading && (
            <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>
          )}
          {!isLoading && suggestions && suggestions.length > 0
            ? suggestions.map((s, i) => (
                <li key={`${s.lat}-${s.lon}-${i}`} role="option">
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(s)}
                  >
                    {s.display_name}
                  </button>
                </li>
              ))
            : null}
          {!isLoading && debounced.length >= 3 && (!suggestions || suggestions.length === 0) && (
            <li className="px-3 py-2 text-sm text-gray-600">
              No matches — try a hotel name, street, or barangay.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
