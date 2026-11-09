import { describe, expect, it } from "vitest";
import {
  conceptDirectionFor,
  outputConceptLabel,
  readDiversityReport,
  recommendContrastingStyles,
  styleContrast,
} from "./concept-directions";
import { DESIGN_TRADITIONS, stylesForTradition } from "./design-directions";

describe("contrasting style selection", () => {
  it("returns distinct valid picks within each selected tradition and handles small catalogs", () => {
    for (const tradition of DESIGN_TRADITIONS) {
      const picks = recommendContrastingStyles(tradition.key);
      expect(new Set(picks).size).toBe(picks.length);
      expect(picks).toHaveLength(Math.min(3, tradition.styles.length));
      expect(picks.every((key) => (tradition.styles as readonly string[]).includes(key))).toBe(
        true,
      );
      expect(recommendContrastingStyles(tradition.key, 1)).toHaveLength(1);
    }
    expect(recommendContrastingStyles("unknown")).toEqual([]);
    expect(recommendContrastingStyles("india", 0)).toEqual([]);
  });
  it("starts with the highest contrast pair rather than the first catalog entries", () => {
    for (const key of ["india", "global"]) {
      const styles = stylesForTradition(key);
      const pair = recommendContrastingStyles(key, 2).map((picked) =>
        styles.find((style) => style.key === picked),
      );
      const first = pair[0];
      const second = pair[1];
      if (!first || !second) throw new Error("Missing contrasting pair");
      const maximum = Math.max(...styles.flatMap((a) => styles.map((b) => styleContrast(a, b))));
      expect(styleContrast(first, second)).toBeCloseTo(maximum);
      expect(styleContrast(first, second)).toBeCloseTo(styleContrast(second, first));
    }
    expect(recommendContrastingStyles("india")).toContain("indian-minimal");
    expect(recommendContrastingStyles("india")).toContain("indian-heritage");
  });
});

describe("concept directions and persisted metadata", () => {
  it("has four different sets of furniture, materials, textiles and light within one style", () => {
    const plans = [0, 1, 2, 3].map((index) => conceptDirectionFor("indian-minimal", index));
    for (const field of ["label", "materials", "furniture", "textiles", "lighting"] as const)
      expect(new Set(plans.map((plan) => plan[field])).size).toBe(4);
    expect(new Set(plans.map((plan) => plan.palette.join(","))).size).toBe(4);
  });
  it("does not relabel old jobs and validates reports before exposing feedback", () => {
    expect(outputConceptLabel({}, "modern", 0)).toBeUndefined();
    expect(outputConceptLabel({ conceptPlanVersion: 1 }, "modern", 0)).toBe("Light & open");
    expect(
      readDiversityReport({ diversityReport: { similarConcepts: true, retryUsed: false } }),
    ).toEqual({ similarConcepts: true, retryUsed: false });
    expect(readDiversityReport({ diversityReport: { similarConcepts: "yes" } })).toBeNull();
  });
});
