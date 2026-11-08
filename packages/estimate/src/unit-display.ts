function ratio(value: number, numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Price must be integer minor units.");
  const product = BigInt(value) * BigInt(numerator);
  const result = (product * BigInt(2) + BigInt(denominator)) / (BigInt(2) * BigInt(denominator));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Price exceeds supported amount.");
  return Number(result);
}

/** Exact international foot: 0.3048 m; price rounding is half-up in minor units. */
export function displayRateMinor(value: number, unit: string, system: string): number {
  if (system !== "IMPERIAL") return value;
  if (unit.startsWith("AREA_")) return ratio(value, 9290304, 100000000);
  if (unit === "LENGTH_PERIMETER") return ratio(value, 3048, 10000);
  return value;
}

export function storedRateMinor(value: number, unit: string, system: string): number {
  if (system !== "IMPERIAL") return value;
  if (unit.startsWith("AREA_")) return ratio(value, 100000000, 9290304);
  if (unit === "LENGTH_PERIMETER") return ratio(value, 10000, 3048);
  return value;
}

export function parseDisplayRate(value: string, unit: string, system: string): number | null {
  const parsed = parseDecimalHundredths(value);
  if (parsed === null || parsed > 1000000000) return null;
  const stored = storedRateMinor(parsed, unit, system);
  return stored <= 1000000000 ? stored : null;
}

export function displayQuantity(value: number, unit: string, system: string): number {
  if (system !== "IMPERIAL") return value;
  if (unit.startsWith("AREA_")) return value / 0.09290304;
  if (unit === "LENGTH_PERIMETER") return value / 0.3048;
  return value;
}

export function storedQuantity(value: number, unit: string, system: string): number {
  if (system !== "IMPERIAL") return value;
  if (unit.startsWith("AREA_")) return value * 0.09290304;
  if (unit === "LENGTH_PERIMETER") return value * 0.3048;
  return value;
}

export function rateUnitLabel(unit: string, system: string): string {
  if (unit.startsWith("AREA_")) return system === "IMPERIAL" ? "sq ft" : "m²";
  if (unit === "LENGTH_PERIMETER") return system === "IMPERIAL" ? "ft" : "m";
  return unit === "LUMP_SUM" ? "lump sum" : "unit";
}

/** Sum already-computed room estimates; never aggregate different currencies. */
export function sumEstimateTotals(
  estimates: { currency: string; totalMinor: number }[],
): { currency: string; totalMinor: number }[] {
  const totals = new Map<string, number>();
  for (const estimate of estimates) {
    const sum = (totals.get(estimate.currency) ?? 0) + estimate.totalMinor;
    if (!Number.isSafeInteger(sum)) throw new Error("Project total exceeds supported amount.");
    totals.set(estimate.currency, sum);
  }
  return [...totals].map(([currency, totalMinor]) => ({ currency, totalMinor }));
}
import { parseDecimalHundredths } from "./decimal-input";
