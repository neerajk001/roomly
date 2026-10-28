import { describe, expect, it } from "vitest";
import {
  computeEstimate,
  deriveQuantities,
  rankChanges,
  recompute,
  type RateItem,
  type RoomInput,
  type Selection,
} from "./index";

const goldenRoom: RoomInput = {
  widthMm: 4000,
  lengthMm: 3000,
  heightMm: 2700,
  openings: [
    { type: "DOOR", widthMm: 900, heightMm: 2100, qty: 1 },
    { type: "WINDOW", widthMm: 1500, heightMm: 1200, qty: 1 },
  ],
};

const goldenItems: RateItem[] = [
  { key: "wall-paint", label: "Wall paint", category: "paint", unit: "AREA_WALL", unitPriceMinor: 1000 },
  { key: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR", unitPriceMinor: 3000 },
  { key: "skirting", label: "Skirting", category: "trim", unit: "LENGTH_PERIMETER", unitPriceMinor: 500 },
  { key: "lighting", label: "Lighting point", category: "lighting", unit: "PER_UNIT", unitPriceMinor: 2500 },
];

const goldenSelections: Selection[] = [
  { itemKey: "wall-paint" },
  { itemKey: "flooring" },
  { itemKey: "skirting" },
  { itemKey: "lighting", quantityOverride: 4 },
];

describe("deriveQuantities (golden room)", () => {
  it("matches the spec quantities", () => {
    expect(deriveQuantities(goldenRoom)).toEqual({
      floorAreaM2: 12,
      ceilingAreaM2: 12,
      perimeterM: 14,
      grossWallAreaM2: 37.8,
      openingsAreaM2: 3.69,
      wallAreaM2: 34.11,
    });
  });
});

describe("computeEstimate (golden test)", () => {
  const result = computeEstimate(goldenRoom, goldenItems, goldenSelections, {
    currency: "USD",
    markupBps: 1000,
    taxBps: 500,
    rangeBps: 1500,
  });

  it("computes line totals exactly", () => {
    expect(result.lines.map((line) => [line.itemKey, line.quantity, line.totalMinor])).toEqual([
      ["wall-paint", 34.11, 34110],
      ["flooring", 12, 36000],
      ["skirting", 14, 7000],
      ["lighting", 4, 10000],
    ]);
  });

  it("computes subtotal, markup, tax and total", () => {
    expect(result.subtotalMinor).toBe(87110);
    expect(result.markupMinor).toBe(8711);
    expect(result.taxMinor).toBe(4791);
    expect(result.totalMinor).toBe(100612);
  });

  it("computes the range", () => {
    expect(result.lowMinor).toBe(85520);
    expect(result.highMinor).toBe(115704);
  });
});

describe("edge cases", () => {
  it("zero openings gives the full wall area", () => {
    const room = { ...goldenRoom, openings: [] };
    expect(deriveQuantities(room).wallAreaM2).toBe(37.8);
  });

  it("openings larger than the walls clamp wall area to zero", () => {
    const room: RoomInput = {
      widthMm: 2000,
      lengthMm: 2000,
      heightMm: 2000,
      openings: [{ type: "WINDOW", widthMm: 3000, heightMm: 3000, qty: 4 }],
    };
    expect(deriveQuantities(room).wallAreaM2).toBe(0);
    const result = computeEstimate(room, goldenItems, [{ itemKey: "wall-paint" }], {
      currency: "USD",
      markupBps: 0,
      taxBps: 0,
    });
    expect(result.lines[0]?.totalMinor).toBe(0);
  });

  it("respects quantity overrides for any unit", () => {
    const result = computeEstimate(goldenRoom, goldenItems, [{ itemKey: "flooring", quantityOverride: 20.5 }], {
      currency: "USD",
      markupBps: 0,
      taxBps: 0,
    });
    expect(result.lines[0]?.quantity).toBe(20.5);
    expect(result.lines[0]?.totalMinor).toBe(61500);
  });

  it("rounds half up at exact boundaries", () => {
    // 0.5 m of a 1 minor/unit item → 1 minor (0.5 rounds up); qty 0.005 m → 0.
    const items: RateItem[] = [
      { key: "unit", label: "Unit", category: "x", unit: "PER_UNIT", unitPriceMinor: 1 },
      { key: "tiny", label: "Tiny", category: "x", unit: "PER_UNIT", unitPriceMinor: 1 },
    ];
    const result = computeEstimate(goldenRoom, items, [
      { itemKey: "unit", quantityOverride: 0.5 },
      { itemKey: "tiny", quantityOverride: 0.005 },
    ], { currency: "USD", markupBps: 0, taxBps: 0 });
    expect(result.lines[0]?.totalMinor).toBe(1);
    expect(result.lines[1]?.quantity).toBe(0.01);
  });

  it("handles markup 0 and tax 0", () => {
    const result = computeEstimate(goldenRoom, goldenItems, goldenSelections, {
      currency: "USD",
      markupBps: 0,
      taxBps: 0,
    });
    expect(result.markupMinor).toBe(0);
    expect(result.taxMinor).toBe(0);
    expect(result.totalMinor).toBe(result.subtotalMinor);
  });

  it("returns zero for empty selections", () => {
    const result = computeEstimate(goldenRoom, goldenItems, [], {
      currency: "USD",
      markupBps: 1000,
      taxBps: 500,
      rangeBps: 2000,
    });
    expect(result.totalMinor).toBe(0);
    expect(result.lowMinor).toBe(0);
    expect(result.highMinor).toBe(0);
  });

  it("ignores unknown selections instead of crashing", () => {
    const result = computeEstimate(goldenRoom, goldenItems, [{ itemKey: "nope" }], {
      currency: "USD",
      markupBps: 0,
      taxBps: 0,
    });
    expect(result.lines).toHaveLength(0);
  });

  it("works for very small and very large rooms", () => {
    const tiny: RoomInput = { widthMm: 1000, lengthMm: 1000, heightMm: 2000, openings: [] };
    expect(deriveQuantities(tiny).floorAreaM2).toBe(1);
    const large: RoomInput = { widthMm: 30000, lengthMm: 30000, heightMm: 6000, openings: [] };
    expect(deriveQuantities(large).floorAreaM2).toBe(900);
  });
});

describe("recompute", () => {
  it("recalculates edited lines with the same rounding", () => {
    const result = recompute(
      [
        { label: "Sofa", category: "furniture", unit: "PER_UNIT", quantity: 1, unitPriceMinor: 120000 },
        { label: "Rug", category: "decor", unit: "PER_UNIT", quantity: 1, unitPriceMinor: 30000 },
      ],
      { currency: "USD", markupBps: 1000, taxBps: 500, rangeBps: 1500 },
    );
    expect(result.subtotalMinor).toBe(150000);
    expect(result.markupMinor).toBe(15000);
    expect(result.taxMinor).toBe(8250);
    expect(result.totalMinor).toBe(173250);
    expect(result.lowMinor).toBe(147263);
    expect(result.highMinor).toBe(199238);
  });
});
describe("rankChanges", () => {
  const result = computeEstimate(
    goldenRoom,
    goldenItems,
    goldenSelections,
    { currency: "USD", markupBps: 0, taxBps: 0 },
  );
  const weights = { paint: 10, flooring: 4, trim: 2, lighting: 7 };

  it("ranks by impact per cost", () => {
    const ranked = rankChanges(result.lines, weights);
    expect(ranked[0]?.itemKey).toBe("lighting");
    expect(ranked[1]?.itemKey).toBe("wall-paint");
    expect(ranked[ranked.length - 1]?.itemKey).toBe("flooring");
  });

  it("marks what fits a budget in ranked order", () => {
    const ranked = rankChanges(result.lines, weights, 20000);
    const affordable = ranked.filter((change) => change.fitsBudget).map((change) => change.itemKey);
    expect(affordable).toContain("lighting");
    expect(affordable).not.toContain("flooring");
  });
});
