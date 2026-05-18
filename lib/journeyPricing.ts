/**
 * Uses route.typical_van_price_php (private van charter estimate) divided by
 * current headcount for a simple per-person estimate. Documented in README.
 */
export function estimatedPricePerPersonPhp(
  typicalVanPricePhp: number,
  totalPassengerCount: number,
): number {
  if (totalPassengerCount < 1) return typicalVanPricePhp;
  return Math.ceil(typicalVanPricePhp / totalPassengerCount);
}
