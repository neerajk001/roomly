import { describe, expect, it } from "vitest";
import { parseRateCardCsv } from "./rate-card-csv";
const header = "key,label,category,unit,price\n";
describe("rate-card CSV validation", () => {
  it("imports JPY as whole yen and rejects fractional yen", () => {
    expect(
      parseRateCardCsv(header + "wall,Paint,paint,AREA_WALL,1500", "JPY")[0]?.unitPriceMinor,
    ).toBe(1500);
    expect(() => parseRateCardCsv(header + "wall,Paint,paint,AREA_WALL,15.50", "JPY")).toThrow(
      "whole yen",
    );
  });
  it("parses exact prices and quoted labels", () => {
    expect(
      parseRateCardCsv(header + 'wall,"Paint, walls",paint,AREA_WALL,1.15')[0]?.unitPriceMinor,
    ).toBe(115);
  });
  it("rejects malformed prices, invalid units and duplicate keys", () => {
    for (const row of [
      "wall,Paint,paint,AREA_WALL,1usd",
      "wall,Paint,paint,UNKNOWN,1.00",
      "wall,Paint,paint,AREA_WALL,1.123",
    ])
      expect(() => parseRateCardCsv(header + row)).toThrow("Row 2");
    expect(() =>
      parseRateCardCsv(header + "wall,Paint,paint,AREA_WALL,1\nwall,Paint,paint,AREA_WALL,2"),
    ).toThrow("unique");
  });
});
