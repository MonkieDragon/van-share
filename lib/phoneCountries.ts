import { ALL_PHONE_COUNTRIES } from "@/lib/phoneCountryList";

export type PhoneCountry = {
  iso2: string;
  name: string;
  dial: string;
  /** Max national significant digits (no trunk 0). */
  nationalMaxLength: number;
  nationalMinLength: number;
};

export const PH_MOBILE: PhoneCountry = ALL_PHONE_COUNTRIES.find((c) => c.iso2 === "PH")!;

/** All countries for international / WhatsApp dialling (includes Philippines). */
export { ALL_PHONE_COUNTRIES };

/** When several territories share a dial code, pick the usual default. */
const DIAL_PREFERRED_ISO: Record<string, string> = {
  "1": "US",
  "44": "GB",
  "61": "AU",
  "64": "NZ",
  "353": "IE",
  "27": "ZA",
};

export function countryByDial(dial: string): PhoneCountry | undefined {
  const preferredIso = DIAL_PREFERRED_ISO[dial];
  if (preferredIso) {
    const preferred = countryByIso(preferredIso);
    if (preferred?.dial === dial) return preferred;
  }
  return ALL_PHONE_COUNTRIES.find((c) => c.dial === dial);
}

export function countryByIso(iso2: string): PhoneCountry | undefined {
  return ALL_PHONE_COUNTRIES.find((c) => c.iso2.toUpperCase() === iso2.toUpperCase());
}

export function flagEmoji(iso2: string): string {
  const code = iso2.toUpperCase();
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  );
}
