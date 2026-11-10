import { describe, expect, it } from "vitest";
import { editTargetSchema, savedEditTarget, editTargetRegions } from "./edit-target";

describe("edit target boundaries", () => {
  const target = { label: "Sofa", region: { left: 100, top: 200, right: 600, bottom: 700 } };
  it("accepts bounded integer coordinates and legacy metadata", () => {
    expect(editTargetSchema.parse(target)).toEqual(target);
    expect(savedEditTarget({ editTarget: target })).toEqual(target);
    expect(savedEditTarget({ sourceOutputId: "legacy" })).toBeUndefined();
  });
  it("rejects reversed, fractional, out-of-bounds, tiny and nearly whole-image areas", () => {
    for (const region of [
      { ...target.region, left: 800 },
      { ...target.region, top: 2.5 },
      { ...target.region, right: 1001 },
      { ...target.region, bottom: 201 },
      { left: 0, top: 0, right: 1000, bottom: 1000 },
    ])
      expect(editTargetSchema.safeParse({ ...target, region }).success).toBe(false);
    expect(editTargetSchema.safeParse({ ...target, label: "<unsafe>" }).success).toBe(false);
  });
  it("retains separate regions while limiting count, duplicates and combined coverage", () => {
    const more = { left: 700, top: 100, right: 900, bottom: 300 };
    const parsed = editTargetSchema.parse({ ...target, additionalRegions: [more] });
    expect(editTargetRegions(parsed)).toEqual([target.region, more]);
    expect(savedEditTarget({ editTarget: parsed })).toEqual(parsed);
    expect(
      editTargetSchema.safeParse({ ...target, additionalRegions: [target.region] }).success,
    ).toBe(false);
    expect(
      editTargetSchema.safeParse({ ...target, additionalRegions: Array(5).fill(more) }).success,
    ).toBe(false);
    expect(
      editTargetSchema.safeParse({
        ...target,
        additionalRegions: [{ left: 0, top: 0, right: 1000, bottom: 700 }],
      }).success,
    ).toBe(false);
  });
});
