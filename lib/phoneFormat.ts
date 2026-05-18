import { ALL_DIAL_CODES_SORTED } from "@/lib/phoneCountryList";
import { countryByDial, PH_MOBILE, type PhoneCountry } from "@/lib/phoneCountries";

export type ContactChannel = "ph-local" | "whatsapp";

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Strip leading 0 from PH trunk prefix when users type 09… */
export function normalizePhNationalDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (d.startsWith("63")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, PH_MOBILE.nationalMaxLength);
}

export function clampNationalDigits(raw: string, country: PhoneCountry): string {
  return digitsOnly(raw).slice(0, country.nationalMaxLength);
}

export function toE164(dial: string, nationalDigits: string): string {
  const n = digitsOnly(nationalDigits);
  if (!n) return "";
  return `+${dial}${n}`;
}

export function isValidPhMobile(nationalDigits: string): boolean {
  const n = normalizePhNationalDigits(nationalDigits);
  return n.length === 10 && n.startsWith("9");
}

export function isValidNationalForCountry(
  nationalDigits: string,
  country: PhoneCountry,
): boolean {
  const n = digitsOnly(nationalDigits);
  if (n.length < country.nationalMinLength || n.length > country.nationalMaxLength) {
    return false;
  }
  if (country.iso2 === "PH") return n.startsWith("9");
  return n.length >= country.nationalMinLength;
}

export function isValidContactPhone(
  e164: string,
  channel: ContactChannel,
  country: PhoneCountry,
): boolean {
  if (!e164.startsWith("+")) return false;
  const body = e164.slice(1);
  if (!/^\d+$/.test(body)) return false;
  const national = body.slice(country.dial.length);
  if (channel === "ph-local") {
    return country.dial === "63" && isValidPhMobile(national);
  }
  return isValidNationalForCountry(national, country);
}

export function parseE164(value: string): { dial: string; national: string } | null {
  const v = value.trim();
  if (!v.startsWith("+")) return null;
  const body = digitsOnly(v.slice(1));
  if (!body) return null;
  const sorted = ALL_DIAL_CODES_SORTED;
  for (const dial of sorted) {
    if (body.startsWith(dial)) {
      return { dial, national: body.slice(dial.length) };
    }
  }
  return null;
}

export function inferChannelFromE164(value: string): ContactChannel {
  const parsed = parseE164(value);
  if (!parsed) return "ph-local";
  if (parsed.dial === "63" && isValidPhMobile(parsed.national)) return "ph-local";
  return "whatsapp";
}

export function countryFromE164(value: string): PhoneCountry {
  const parsed = parseE164(value);
  if (!parsed) return PH_MOBILE;
  return countryByDial(parsed.dial) ?? PH_MOBILE;
}

export function nationalFromE164(value: string): string {
  const parsed = parseE164(value);
  if (!parsed) return "";
  if (parsed.dial === "63") return normalizePhNationalDigits(parsed.national);
  return parsed.national;
}
