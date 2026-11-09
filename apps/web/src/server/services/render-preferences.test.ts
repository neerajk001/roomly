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
