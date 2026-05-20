/** ISO 3166-1 alpha-2 codes with display labels for profile nationality. */
export const NATIONALITIES: { code: string; label: string }[] = [
  { code: "PH", label: "Philippines" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "CN", label: "China" },
  { code: "IN", label: "India" },
  { code: "SG", label: "Singapore" },
  { code: "MY", label: "Malaysia" },
  { code: "TH", label: "Thailand" },
  { code: "VN", label: "Vietnam" },
  { code: "ID", label: "Indonesia" },
  { code: "NZ", label: "New Zealand" },
  { code: "IE", label: "Ireland" },
  { code: "CH", label: "Switzerland" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "BE", label: "Belgium" },
  { code: "AT", label: "Austria" },
  { code: "PL", label: "Poland" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "ZA", label: "South Africa" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "IL", label: "Israel" },
  { code: "OTHER", label: "Other" },
];

export function nationalityLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return NATIONALITIES.find((n) => n.code === code)?.label ?? code;
}
