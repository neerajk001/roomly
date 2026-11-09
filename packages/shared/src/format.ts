/** UI-only formatting helpers. Storage and math always stay metric/mm. */

export type UnitSystem = "METRIC" | "IMPERIAL";
export type DisplayLengthUnit = "m" | "ft";

const MM_PER_FOOT = 304.8;
const M2_PER_SQFT = 10.7639;

export function formatLength(mm: number | null | undefined, system: UnitSystem): string {
  if (mm === null || mm === undefined) return "—";
  if (system === "IMPERIAL") {
    const feet = mm / MM_PER_FOOT;
    return `${feet.toFixed(1)} ft`;
  }
  return `${(mm / 1000).toFixed(2)} m`;
}

export function formatArea(m2: number, system: UnitSystem): string {
  if (system === "IMPERIAL") {
    return `${(m2 * M2_PER_SQFT).toFixed(0)} sq ft`;
  }
  return `${m2.toFixed(1)} m²`;
}

/** Currency exponent for the currencies we support (JPY has no minor unit). */
function currencyExponent(currency: string): number {
  return currency === "JPY" ? 0 : 2;
}

export function formatMoney(minor: number, currency: string, locale = "en-US"): string {
  const exponent = currencyExponent(currency);
  const value = minor / Math.pow(10, exponent);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minor % Math.pow(10, exponent) === 0 ? 0 : exponent,
    maximumFractionDigits: exponent,
  }).format(value);
}

/** Millimetres per displayed unit, for the room form / rate card editors. */
export function mmPerDisplayUnit(system: UnitSystem): number {
  return system === "IMPERIAL" ? MM_PER_FOOT : 1000;
}
