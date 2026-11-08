import { describe, expect, it } from "vitest";
import {
  displayRateMinor,
  storedRateMinor,
  displayQuantity,
  storedQuantity,
  sumEstimateTotals,
  parseDisplayRate,
} from "./unit-display";

describe("imperial presentation and project totals", () => {
  it("rejects oversized display prices without overflowing or throwing", () => {
    expect(parseDisplayRate("999999999999999999", "AREA_WALL", "IMPERIAL")).toBeNull();
    expect(parseDisplayRate("1.15", "PER_UNIT", "IMPERIAL")).toBe(115);
  });
  it("converts integer prices with exact rational rounding", () => {
    expect(displayRateMinor(10000, "AREA_WALL", "IMPERIAL")).toBe(929);
    expect(storedRateMinor(929, "AREA_WALL", "IMPERIAL")).toBe(10000);
    expect(displayRateMinor(10000, "LENGTH_PERIMETER", "IMPERIAL")).toBe(3048);
    expect(storedRateMinor(3048, "LENGTH_PERIMETER", "IMPERIAL")).toBe(10000);
    expect(displayRateMinor(12345, "PER_UNIT", "IMPERIAL")).toBe(12345);
  });
  it("converts quantities without changing metric storage", () => {
    expect(
      storedQuantity(displayQuantity(12, "AREA_FLOOR", "IMPERIAL"), "AREA_FLOOR", "IMPERIAL"),
    ).toBeCloseTo(12);
  });
  it("keeps project currencies separate", () => {
    expect(
      sumEstimateTotals([
        { currency: "USD", totalMinor: 100 },
        { currency: "USD", totalMinor: 250 },
        { currency: "INR", totalMinor: 50 },
      ]),
    ).toEqual([
      { currency: "USD", totalMinor: 350 },
      { currency: "INR", totalMinor: 50 },
    ]);
  });
});
