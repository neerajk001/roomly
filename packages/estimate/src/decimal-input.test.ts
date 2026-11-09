import { describe, expect, it } from "vitest";
import {
  parseDecimalHundredths,
  formatDecimalHundredths,
  parseMoneyInput,
  formatMoneyInput,
} from "./decimal-input";

describe("exact money and percentage input", () => {
  it("retains fractional prices and uses whole yen for JPY", () => {
    expect(parseMoneyInput("1.15", "USD")).toBe(115);
    expect(parseMoneyInput("1500.00", "JPY")).toBe(1500);
    expect(parseMoneyInput("1500.50", "JPY")).toBeNull();
    expect(formatMoneyInput(1500, "JPY")).toBe("1500");
    expect(formatMoneyInput(115, "INR")).toBe("1.15");
  });
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
