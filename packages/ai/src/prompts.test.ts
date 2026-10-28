import { describe, expect, it } from "vitest";
import { buildEditPrompt, buildRestylePrompt, sanitizeInstruction } from "./prompts";

describe("buildRestylePrompt", () => {
  it("matches the spec template without a renter clause", () => {
    const prompt = buildRestylePrompt({
      roomTypeLabel: "living room",
      styleLabel: "Scandinavian",
      keepList: [],
      renterMode: false,
    });
    expect(prompt).toBe(
      [
        "Redesign this living room in a Scandinavian interior design style.",
        "Keep the room's structure exactly as in the photo: walls, windows, doors, ceiling, camera angle and perspective.",
        "Keep these items unchanged: none.",
        "Photorealistic interior photograph with natural lighting. No text, logos or watermarks.",
      ].join("\n"),
    );
  });

  it("adds the renter clause and the keep list", () => {
    const prompt = buildRestylePrompt({
      roomTypeLabel: "bedroom",
      styleLabel: "Japandi",
      keepList: ["the rug", "the bookshelf"],
      renterMode: true,
    });
    expect(prompt).toContain("Keep these items unchanged: the rug, the bookshelf.");
    expect(prompt).toContain("Only change things a renter can change without construction");
  });
});

describe("buildEditPrompt", () => {
  it("wraps the sanitized instruction", () => {
    expect(buildEditPrompt("  replace   the sofa  ")).toBe(
      [
        "Apply only this change: replace the sofa.",
        "Keep everything else in the image identical, including the room structure, camera angle and all other objects.",
      ].join("\n"),
    );
  });
});

describe("sanitizeInstruction", () => {
  it("strips control characters and collapses whitespace", () => {
    expect(sanitizeInstruction("add\u0000 a\u0007 rug\u001f please")).toBe("add a rug please");
  });

  it("caps length at 300 characters", () => {
    expect(sanitizeInstruction("a".repeat(500))).toHaveLength(300);
  });

  it("trims", () => {
    expect(sanitizeInstruction("   paint the walls   ")).toBe("paint the walls");
  });
});
