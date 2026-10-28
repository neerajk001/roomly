import { describe, expect, it } from "vitest";
import {
  buildEditPrompt,
  buildRestylePrompt,
  sanitizeInstruction,
  variationPrompt,
} from "./prompts";

const STAGING_LINE =
  "Photorealistic interior photograph, professional staging, realistic materials and surface textures (fabric, wood grain, stone, paint finish), soft natural daylight and believable shadows. No people, no text, logos or watermarks.";

describe("buildRestylePrompt", () => {
  it("matches the staging template without a renter clause", () => {
    const prompt = buildRestylePrompt({
      roomTypeLabel: "living room",
      styleLabel: "Scandinavian",
      styleHint: "light woods, white walls, hygge textiles",
      keepList: [],
      renterMode: false,
    });
    expect(prompt).toBe(
      [
"Redesign this living room in a Scandinavian interior design style as a fully furnished, move-in-ready room.",
        "Style direction — light woods, white walls, hygge textiles. Interpret this style faithfully and distinctly; do not default to a generic neutral staging.",
        "Keep the room's structure exactly as in the photo: walls, windows, doors, ceiling, camera angle, perspective and dimensions.",
        "Remove moving boxes, trash, construction debris and clutter; replace them with furniture, rugs, lighting and decor that fit the space.",
        "Keep these items unchanged: none.",
        STAGING_LINE,
      ].join("\n"),
    );
  });

  it("sends the style hint so styles do not converge", () => {
    const modern = buildRestylePrompt({
      roomTypeLabel: "living room",
      styleLabel: "Modern",
      styleHint: "clean lines, neutral palette, integrated lighting",
      keepList: [],
      renterMode: false,
    });
    const scandi = buildRestylePrompt({
      roomTypeLabel: "living room",
      styleLabel: "Scandinavian",
      styleHint: "light woods, white walls, hygge textiles",
      keepList: [],
      renterMode: false,
    });
    expect(modern).not.toBe(scandi);
    expect(modern).toContain("clean lines, neutral palette, integrated lighting");
  });

  it("adds the renter clause and the keep list", () => {
    const prompt = buildRestylePrompt({
      roomTypeLabel: "bedroom",
      styleLabel: "Japandi",
      styleHint: "natural textures, low furniture, decluttered",
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
        "Photorealistic result with consistent lighting and materials.",
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
describe("variationPrompt", () => {
  it("gives each variation a distinct emphasis while keeping the base", () => {
    const base = "Redesign this living room.";
    const prompts = [0, 1, 2, 3].map((index) => variationPrompt(base, index));
    expect(new Set(prompts).size).toBe(4);
    for (const prompt of prompts) {
      expect(prompt.startsWith(base)).toBe(true);
      expect(prompt).toContain("Variation emphasis");
    }
  });
});