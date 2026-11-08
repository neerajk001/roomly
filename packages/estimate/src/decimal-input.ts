/** Parses non-negative money/percent input into integer hundredths, without float math. */
export function parseDecimalHundredths(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (match === null) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const result = whole * 100 + fraction;
  return Number.isSafeInteger(result) ? result : null;
}

export function formatDecimalHundredths(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Expected non-negative integer hundredths.");
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}
