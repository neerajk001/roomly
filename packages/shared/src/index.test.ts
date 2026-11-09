import { describe, expect, it } from "vitest";
import { formatArea, formatLength, formatMoney } from "./format";
import { CATEGORY_IMPACT, defaultScopeFor } from "./default-scope";
import { defaultRateItems } from "./rate-card-defaults";
import { roomNeeds, typicalSizeFor } from "./room-needs";
import { STYLES, recommendStyles } from "./styles";

describe("formatting", () => {
  it("formats lengths metrically and imperially", () => {
    expect(formatLength(4000, "METRIC")).toBe("4.00 m");
    expect(formatLength(3048, "IMPERIAL")).toBe("10.0 ft");
    expect(formatLength(null, "METRIC")).toBe("—");
  });

  it("formats areas", () => {
    expect(formatArea(12, "METRIC")).toBe("12.0 m²");
    expect(formatArea(12, "IMPERIAL")).toBe("129 sq ft");
  });

  it("formats money from minor units", () => {
    expect(formatMoney(100612, "USD")).toBe("$1,006.12");
    expect(formatMoney(123450, "INR")).toBe("₹1,234.50");
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
    expect(defaultRateItems("JPY").find((item) => item.key === "wall-paint")?.unitPriceMinor).toBe(
      1800,
    );
  });
});

describe("defaultScopeFor", () => {
  it("includes flooring and ceiling work for owners", () => {
    const scope = defaultScopeFor("LIVING_ROOM", false);
    expect(scope.some((item) => item.category === "flooring")).toBe(true);
    expect(scope.some((item) => item.category === "ceiling")).toBe(true);
  });

  it("strips structural work in renter mode", () => {
    const scope = defaultScopeFor("LIVING_ROOM", true);
    expect(scope.some((item) => item.category === "flooring")).toBe(false);
    expect(scope.some((item) => item.category === "ceiling")).toBe(false);
    expect(scope.some((item) => item.category === "paint")).toBe(true);
  });

  it("has impact weights for every scope category", () => {
    for (const item of defaultScopeFor("BEDROOM", false)) {
      expect(CATEGORY_IMPACT[item.category]).toBeGreaterThan(0);
    }
  });
});

describe("defaultRateItems", () => {
  it("provides every key used by the default scope", () => {
    const keys = new Set(defaultRateItems("USD").map((item) => item.key));
    for (const roomType of ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BATHROOM", "HOME_OFFICE"]) {
      for (const item of defaultScopeFor(roomType, false)) {
        expect(keys.has(item.itemKey)).toBe(true);
      }
    }
  });

  it("scales prices per currency", () => {
    const usd =
      defaultRateItems("USD").find((item) => item.key === "wall-paint")?.unitPriceMinor ?? 0;
    const inr =
      defaultRateItems("INR").find((item) => item.key === "wall-paint")?.unitPriceMinor ?? 0;
    expect(usd).toBeGreaterThan(0);
    expect(inr).toBeGreaterThan(usd);
  });
});

describe("roomNeeds", () => {
  it("derives sofa and rug sizes from the room", () => {
    const needs = roomNeeds({ roomType: "LIVING_ROOM", widthMm: 4200, lengthMm: 5200 });
    const sofa = needs.find((need) => need.key === "sofa");
    const rug = needs.find((need) => need.key === "rug");
    expect(sofa?.sizeGuide).toContain("2.4");
    expect(rug?.sizeGuide).toContain("200");
    expect(needs.reduce((sum, need) => sum + need.budgetShareBps, 0)).toBeLessThanOrEqual(10_000);
  });

  it("works without dimensions", () => {
    const needs = roomNeeds({ roomType: "LIVING_ROOM", widthMm: null, lengthMm: null });
    expect(needs.length).toBeGreaterThan(0);
    expect(needs[0]?.sizeGuide).not.toBe("");
  });

  it("has typical sizes for every room type", () => {
    expect(typicalSizeFor("BATHROOM").widthMm).toBeLessThan(typicalSizeFor("LIVING_ROOM").widthMm);
    expect(typicalSizeFor("UNKNOWN_TYPE").widthMm).toBeGreaterThan(0);
  });
});

describe("styles", () => {
  it("every style has a palette and tags", () => {
    for (const style of STYLES) {
      expect(style.palette).toHaveLength(3);
      expect(style.tags.length).toBeGreaterThan(0);
    }
  });

  it("recommends three distinct styles from quiz picks", () => {
    const recommended = recommendStyles(["scandinavian", "minimalist"]);
    expect(recommended).toHaveLength(3);
    expect(new Set(recommended).size).toBe(3);
    expect(recommended).toContain("scandinavian");
  });
});
