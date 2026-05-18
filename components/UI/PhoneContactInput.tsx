"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ALL_PHONE_COUNTRIES,
  flagEmoji,
  PH_MOBILE,
  type PhoneCountry,
} from "@/lib/phoneCountries";
import {
  clampNationalDigits,
  countryFromE164,
  inferChannelFromE164,
  isValidContactPhone,
  nationalFromE164,
  normalizePhNationalDigits,
  toE164,
  type ContactChannel,
} from "@/lib/phoneFormat";

type Props = {
  value: string;
  onChange: (e164: string) => void;
  className?: string;
  label?: string;
};

function initialState(value: string) {
  const channel: ContactChannel = value ? inferChannelFromE164(value) : "ph-local";
  const country = channel === "ph-local" ? PH_MOBILE : countryFromE164(value);
  const national = value ? nationalFromE164(value) : "";
  return { channel, country, national };
}

function CountryCodeField({
  country,
  locked,
  onSelect,
  controlId,
}: {
  country: PhoneCountry;
  locked: boolean;
  onSelect: (c: PhoneCountry) => void;
  controlId: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || locked) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, locked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_PHONE_COUNTRIES;
    const digits = q.replace(/\D/g, "");
    return ALL_PHONE_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().includes(q) ||
        c.dial.startsWith(digits) ||
        `+${c.dial}`.includes(q),
    );
  }, [query]);

  const triggerClass = locked
    ? "cursor-default border-gray-200 bg-gray-100 text-gray-800"
    : "cursor-pointer border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100";

  return (
    <div ref={rootRef} className="relative w-[6.75rem] shrink-0">
      <button
        type="button"
        id={controlId}
        disabled={locked}
        aria-haspopup={locked ? undefined : "listbox"}
        aria-expanded={locked ? undefined : open}
        aria-disabled={locked}
        title={locked ? "Philippines country code (fixed for local mobile)" : "Choose country code"}
        className={`flex w-full items-center gap-0.5 rounded-lg border px-1.5 py-2 text-left text-sm font-medium shadow-sm ${triggerClass}`}
        onClick={() => {
          if (!locked) setOpen((v) => !v);
        }}
      >
        <span aria-hidden className="shrink-0">
          {flagEmoji(country.iso2)}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs">+{country.dial}</span>
        {!locked && (
          <span className="shrink-0 text-[10px] leading-none text-gray-500" aria-hidden>
            ▾
          </span>
        )}
      </button>
      {open && !locked && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[11.5rem] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-1.5">
            <input
              type="search"
              placeholder="Search…"
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox" aria-labelledby={controlId}>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-600">No matches</li>
            ) : (
              filtered.map((c) => (
                <li key={c.iso2} role="option" aria-selected={c.iso2 === country.iso2}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs hover:bg-gray-100 ${
                      c.iso2 === country.iso2 ? "bg-blue-50 font-semibold text-blue-950" : "text-gray-900"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(c);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="shrink-0" aria-hidden>
                      {flagEmoji(c.iso2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 text-gray-600">+{c.dial}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PhoneContactInput({
  value,
  onChange,
  className = "",
  label = "Contact number",
}: Props) {
  const hintId = useId();
  const countryControlId = useId();
  const init = initialState(value);
  const [channel, setChannel] = useState<ContactChannel>(init.channel);
  const [country, setCountry] = useState<PhoneCountry>(init.country);
  const [national, setNational] = useState(init.national);
  const [touched, setTouched] = useState(false);

  const isLocalPh = channel === "ph-local";
  const activeCountry = isLocalPh ? PH_MOBILE : country;

  useEffect(() => {
    if (!value) return;
    const next = initialState(value);
    setChannel(next.channel);
    setCountry((prev) => {
      if (next.channel === "whatsapp" && prev.dial === next.country.dial) {
        return prev;
      }
      return next.country;
    });
    setNational(next.national);
  }, [value]);

  const syncOut = useCallback(
    (ch: ContactChannel, c: PhoneCountry, nat: string) => {
      const normalized =
        ch === "ph-local" ? normalizePhNationalDigits(nat) : clampNationalDigits(nat, c);
      onChange(toE164(c.dial, normalized));
    },
    [onChange],
  );

  const switchChannel = (next: ContactChannel) => {
    setChannel(next);
    const c = next === "ph-local" ? PH_MOBILE : country;
    const nat =
      next === "ph-local" ? normalizePhNationalDigits(national) : clampNationalDigits(national, c);
    setNational(nat);
    syncOut(next, c, nat);
  };

  const onNationalChange = (raw: string) => {
    const nat = isLocalPh
      ? normalizePhNationalDigits(raw)
      : clampNationalDigits(raw, activeCountry);
    setNational(nat);
    syncOut(channel, activeCountry, nat);
  };

  const onCountrySelect = (next: PhoneCountry) => {
    setCountry(next);
    const nat = clampNationalDigits(national, next);
    setNational(nat);
    syncOut("whatsapp", next, nat);
  };

  const e164 = toE164(activeCountry.dial, national);
  const valid = isValidContactPhone(e164, channel, activeCountry);
  const showInvalid = touched && national.length > 0 && !valid;

  const numberInputClass =
    "min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm";

  return (
    <div className={className}>
      <span className="font-semibold text-gray-950">{label}</span>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchChannel("ph-local")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            isLocalPh
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
          }`}
        >
          Philippine mobile
        </button>
        <button
          type="button"
          onClick={() => switchChannel("whatsapp")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            !isLocalPh
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
          }`}
        >
          WhatsApp
        </button>
      </div>
      <p id={hintId} className="mt-1 text-xs text-gray-600">
        {isLocalPh
          ? "Local SIM in the Philippines (10 digits, starts with 9)."
          : "WhatsApp number — pick your country code, then enter digits only."}
      </p>
      <div className="mt-2 flex gap-2">
        <CountryCodeField
          country={activeCountry}
          locked={isLocalPh}
          onSelect={onCountrySelect}
          controlId={countryControlId}
        />
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className={`${numberInputClass} ${showInvalid ? "border-red-500 ring-1 ring-red-200" : ""}`}
          placeholder={
            isLocalPh ? "9XX XXX XXXX" : `up to ${activeCountry.nationalMaxLength} digits`
          }
          value={national}
          onChange={(e) => onNationalChange(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showInvalid}
          aria-describedby={hintId}
          maxLength={activeCountry.nationalMaxLength}
        />
      </div>
      {showInvalid && (
        <p className="mt-1 text-xs text-red-700">
          {isLocalPh
            ? "Enter a valid Philippine mobile number (10 digits starting with 9)."
            : `Enter ${activeCountry.nationalMinLength}–${activeCountry.nationalMaxLength} digits for ${activeCountry.name}.`}
        </p>
      )}
    </div>
  );
}
