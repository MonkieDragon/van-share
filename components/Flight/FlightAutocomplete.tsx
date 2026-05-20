"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createJourneyFieldClass } from "@/components/UI/JourneyDatePicker";
import { formatFlightArrivalDisplay } from "@/lib/flightFormat";
import type { FlightOption, SelectedFlight } from "@/lib/flightTypes";

type Props = {
  date: string;
  value: SelectedFlight | null;
  onChange: (flight: SelectedFlight | null) => void;
};

export default function FlightAutocomplete({ date, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);
  const [results, setResults] = useState<FlightOption[]>([]);
  const [msg, setMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setQuery("");
      setOpen(false);
      setResults([]);
      setMsg("");
    }
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchResults = useCallback(
    async (q: string) => {
      if (!date || q.trim().length < 2) {
        setResults([]);
        setMsg("");
        return;
      }
      setLoading(true);
      setMsg("");
      try {
        const res = await fetch(
          `/api/flights/search?q=${encodeURIComponent(q.trim())}&date=${encodeURIComponent(date)}`,
        );
        const data = (await res.json()) as {
          flights?: FlightOption[];
          available?: boolean;
        };
        if (!data.available) {
          setAvailable(false);
          setResults([]);
          setMsg("Flight data unavailable");
          return;
        }
        setAvailable(true);
        const flights = data.flights ?? [];
        setResults(flights);
        setMsg(flights.length === 0 ? "No flights found" : "");
      } catch {
        setAvailable(false);
        setResults([]);
        setMsg("Flight data unavailable");
      } finally {
        setLoading(false);
      }
    },
    [date],
  );

  const onInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchResults(text);
    }, 300);
  };

  const onBlur = () => {
    window.setTimeout(() => {
      if (!value) setQuery("");
    }, 150);
  };

  const select = (flight: FlightOption) => {
    onChange(flight);
    setQuery("");
    setOpen(false);
    setResults([]);
    setMsg("");
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setMsg("");
    setOpen(false);
  };

  if (value) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
              Selected arrival flight
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-950">{value.flightNumber}</p>
            <p className="text-sm text-gray-800">
              {value.airline} · {value.originIata} → {value.destinationIata}
            </p>
            <p className="text-xs text-gray-700">
              Scheduled arrival {formatFlightArrivalDisplay(value.scheduledArrival)}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold text-gray-700 hover:underline"
          >
            Change flight
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-semibold text-gray-950">
        Search flight
        <input
          type="text"
          className={`mt-1 ${createJourneyFieldClass}`}
          placeholder="Flight number or airline (e.g. 5J, Cebu Pacific)"
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => {
            setOpen(true);
            if (query.trim().length >= 2) void fetchResults(query);
          }}
          onBlur={onBlur}
          autoComplete="off"
        />
      </label>
      <p className="mt-1 text-xs text-gray-600">
        Pick a flight from the list below. Typed text alone is not saved.
      </p>
      {open && (loading || results.length > 0 || msg) && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-600">Searching…</li>
          )}
          {!loading &&
            results.map((f) => (
              <li key={`${f.flightNumber}-${f.scheduledArrival}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-blue-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(f)}
                >
                  <span className="font-semibold text-gray-950">{f.flightNumber}</span>
                  <span className="text-gray-700"> · {f.airline}</span>
                  <span className="block text-xs text-gray-600">
                    {f.originIata} → {f.destinationIata} ·{" "}
                    {formatFlightArrivalDisplay(f.scheduledArrival)}
                  </span>
                </button>
              </li>
            ))}
          {!loading && msg && (
            <li className="px-3 py-2 text-sm text-gray-700">{msg}</li>
          )}
        </ul>
      )}
      {!available && !open && msg && (
        <p className="mt-1 text-xs text-amber-800">{msg}</p>
      )}
    </div>
  );
}
