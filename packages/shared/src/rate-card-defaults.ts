/**
 * Illustrative default rate cards per currency (minor units per m² / m / unit).
 * These are NOT market data — the UI always labels them "rough range".
 * Source: hand-picked editorial defaults, 2026-10.
 */
export interface DefaultRateItem {
  key: string;
  label: string;
  category: string;
  unit: "AREA_FLOOR" | "AREA_CEILING" | "AREA_WALL" | "LENGTH_PERIMETER" | "PER_UNIT" | "LUMP_SUM";
  unitPriceMinor: number;
}

interface Baseline {
  currency: string;
  /** Relative multiplier versus USD illustrative prices. */
  factor: number;
}

const BASELINES: Baseline[] = [
  { currency: "USD", factor: 1 },
  { currency: "EUR", factor: 0.95 },
  { currency: "GBP", factor: 0.85 },
  { currency: "INR", factor: 28 },
  { currency: "AED", factor: 3.4 },
  { currency: "AUD", factor: 1.45 },
  { currency: "CAD", factor: 1.3 },
  { currency: "SGD", factor: 1.35 },
  { currency: "JPY", factor: 150 },
  { currency: "CHF", factor: 0.9 },
  { currency: "SEK", factor: 10.5 },
  { currency: "NZD", factor: 1.6 },
];

/** USD illustrative prices in minor units (cents). */
const USD_ITEMS: DefaultRateItem[] = [
  { key: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL", unitPriceMinor: 1200 },
  { key: "ceiling-paint", label: "Paint ceiling", category: "ceiling", unit: "AREA_CEILING", unitPriceMinor: 900 },
  { key: "flooring", label: "Flooring (mid-range)", category: "flooring", unit: "AREA_FLOOR", unitPriceMinor: 3500 },
  { key: "skirting", label: "Skirting", category: "trim", unit: "LENGTH_PERIMETER", unitPriceMinor: 600 },
  { key: "lighting-points", label: "Lighting point", category: "lighting", unit: "PER_UNIT", unitPriceMinor: 3000 },
  { key: "curtains", label: "Curtains (per room)", category: "curtains", unit: "LUMP_SUM", unitPriceMinor: 25000 },
  { key: "furniture", label: "Furniture package (mid-range)", category: "furniture", unit: "LUMP_SUM", unitPriceMinor: 220000 },
  { key: "decor", label: "Decor, art and plants", category: "decor", unit: "LUMP_SUM", unitPriceMinor: 45000 },
  { key: "builtins", label: "Built-in / wardrobe", category: "builtins", unit: "LUMP_SUM", unitPriceMinor: 180000 },
  { key: "cabinets-paint", label: "Refresh cabinets", category: "builtins", unit: "LUMP_SUM", unitPriceMinor: 60000 },
];

function roundMinor(value: number, currency: string): number {
  // JPY has no minor unit in practice; keep whole yen.
  if (currency === "JPY") return Math.round(value / 100) * 100;
  return Math.round(value / 10) * 10;
}

export function defaultRateItems(currency: string): DefaultRateItem[] {
  const baseline = BASELINES.find((entry) => entry.currency === currency) ?? BASELINES[0];
  const factor = baseline?.factor ?? 1;
  return USD_ITEMS.map((item) => ({
    ...item,
    unitPriceMinor: roundMinor(item.unitPriceMinor * factor, currency),
  }));
}

export const DEFAULT_RATE_CARD_CURRENCIES = BASELINES.map((entry) => entry.currency);
