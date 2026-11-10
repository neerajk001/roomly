import { describe, expect, it } from "vitest";
import { createRenderSchema } from "./renders";

describe("render preference boundary", () => {
  const base = {
    roomId: "room",
    kind: "RESTYLE",
    styleKey: "indian-minimal",
    styleKeys: ["indian-minimal", "indian-craft", "indian-heritage"],
    traditionKey: "india",
    variations: 3,
    budgetTier: "mid",
  };
  it("retains every valid selected style and optional budget tier", () => {
    expect(createRenderSchema.parse(base)).toMatchObject(base);
    expect(
      createRenderSchema.safeParse({ roomId: "room", kind: "RESTYLE", styleKey: "modern" }).success,
    ).toBe(true);
  });
  it("validates known must-have item IDs without changing legacy staging items", () => {
    expect(
      createRenderSchema.parse({ ...base, includeItems: ["counter-organizers"] }),
    ).toMatchObject({ includeItems: ["counter-organizers"] });
    expect(createRenderSchema.safeParse({ ...base, includeItems: ["unknown"] }).success).toBe(
      false,
    );
    expect(createRenderSchema.safeParse({ ...base, includeItems: ["sofa", "sofa"] }).success).toBe(
      false,
    );
  });
  it("allows validated areas only for a single-image edit", () => {
    const editTarget = { label: "Sofa", region: { left: 100, top: 200, right: 500, bottom: 700 } };
    const edit = {
      roomId: "room",
      kind: "EDIT",
      variations: 1,
      sourceOutputId: "selected-output",
      instruction: "Change the sofa",
      editTarget,
    };
    expect(createRenderSchema.parse(edit)).toMatchObject({ editTarget });
    expect(createRenderSchema.safeParse({ ...base, editTarget }).success).toBe(false);
    expect(createRenderSchema.safeParse({ ...edit, variations: 2 }).success).toBe(false);
    expect(
      createRenderSchema.safeParse({
        ...edit,
        editTarget: { ...editTarget, region: { ...editTarget.region, right: 2000 } },
      }).success,
    ).toBe(false);
  });
  it("rejects silent style loss, mismatched primary style, regional mismatch and invalid tiers", () => {
    for (const input of [
      { ...base, variations: 2 },
      { ...base, styleKey: "modern" },
      { ...base, traditionKey: "europe" },
      { ...base, budgetTier: "invalid" },
    ])
      expect(createRenderSchema.safeParse(input).success).toBe(false);
  });
});
