import { describe, expect, it } from "vitest";
import { parseDecimalHundredths, formatDecimalHundredths } from "./decimal-input";

describe("exact money and percentage input", () => {
  it("parses hundredths without binary-float rounding", () => {
    expect(parseDecimalHundredths("1.15")).toBe(115);
    expect(parseDecimalHundredths(" 1234.5 ")).toBe(123450);
    expect(parseDecimalHundredths("0.01")).toBe(1);
    expect(parseDecimalHundredths("0")).toBe(0);
    expect(formatDecimalHundredths(115)).toBe("1.15");
  });
  it("rejects malformed, negative, overprecise and unsafe input", () => {
    for (const value of [
      "",
      "1.239",
      "1e3",
      "12usd",
      "-1",
      "NaN",
      "Infinity",
      "9007199254740992",
    ]) {
      expect(parseDecimalHundredths(value)).toBeNull();
    }
  });
});
