import { describe, expect, it } from "vitest";
import {
  DESIGN_TRADITIONS,
  designPreferencesSchema,
  outputStyleKey,
  PREVIEW_ROOMS,
  stylePreviewTile,
  stylesForTradition,
} from "./design-directions";
import { getStyle, STYLES } from "./styles";

describe("design directions", () => {
  it("has valid regional directions, preserves legacy keys and exposes every look", () => {
    expect(getStyle("modern")).toBeDefined();
    expect(getStyle("indian-contemporary")).toBeDefined();
    expect(new Set(STYLES.map((style) => style.key)).size).toBe(STYLES.length);
    for (const tradition of DESIGN_TRADITIONS) {
      expect(stylesForTradition(tradition.key).length).toBeGreaterThan(0);
      for (const key of tradition.styles) expect(getStyle(key)).toBeDefined();
    }
    expect(stylesForTradition("global")).toHaveLength(STYLES.length);
  });
  it("rejects invalid, duplicate and mismatched choices while keeping old jobs valid", () => {
    expect(designPreferencesSchema.safeParse({}).success).toBe(true);
    expect(designPreferencesSchema.safeParse({ styleKeys: ["not-a-style"] }).success).toBe(false);
    expect(designPreferencesSchema.safeParse({ styleKeys: ["modern", "modern"] }).success).toBe(
      false,
    );
    expect(
      designPreferencesSchema.safeParse({ traditionKey: "india", styleKeys: ["modern"] }).success,
    ).toBe(false);
    expect(
      designPreferencesSchema.safeParse({
        traditionKey: "india",
        styleKeys: ["indian-craft"],
        budgetTier: "budget",
      }).success,
    ).toBe(true);
    expect(designPreferencesSchema.safeParse({ budgetTier: "unknown" }).success).toBe(false);
  });
  it("assigns each selected look to an output in order and supports legacy jobs", () => {
    const params = {
      styleKeys: ["indian-minimal", "indian-craft", "indian-heritage"],
      traditionKey: "india",
    };
    expect([0, 1, 2, 3].map((index) => outputStyleKey(params, "modern", index))).toEqual([
      "indian-minimal",
      "indian-craft",
      "indian-heritage",
      "indian-minimal",
    ]);
    expect(outputStyleKey({ providerQuality: "low" }, "coastal", 2)).toBe("coastal");
  });
  it("maps nine room types to separate preview tiles with an explicit fallback", () => {
    expect(new Set(PREVIEW_ROOMS.map((room) => JSON.stringify(stylePreviewTile(room)))).size).toBe(
      9,
    );
    expect(stylePreviewTile("KITCHEN")).toEqual({ column: 2, row: 0 });
    expect(stylePreviewTile("OTHER")).toEqual({ column: 0, row: 0 });
  });
});
