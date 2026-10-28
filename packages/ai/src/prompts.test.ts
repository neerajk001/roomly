import { describe, expect, it } from "vitest";
import {
  buildEditPrompt,
  buildRestylePrompt,
  sanitizeInstruction,
  variationPrompt,
} from "./prompts";

const structureLock = [
  "STRICT STRUCTURAL CONSTRAINTS — the room architecture must remain identical to the photo:",
  "- Do not move, add, remove, resize or redraw windows, doors, walls, ceilings, openings, radiators, built-in cabinets or mouldings.",
  "- Do not change the camera angle, perspective, framing or room dimensions.",
  "- The floor layout, floor material, floor pattern and floor direction stay exactly as photographed.",
  "- Only loose furniture, rugs, lighting fixtures, textiles, art and decor may change.",
].join("\n");

const stagingLine =
  "Photorealistic interior photograph, professional staging, realistic materials and surface textures (fabric, wood grain, stone, paint finish), soft natural daylight and believable shadows. No people, no text, logos or watermarks.";

const baseInput = {
  roomTypeLabel: "living room",
  styleLabel: "Scandinavian",
  styleHint: "light woods, white walls, hygge textiles",
  keepList: [] as string[],
  renterMode: false,
};

describe("buildRestylePrompt", () => {
  it("locks the architecture and only allows furnishings to change", () => {
    const prompt = buildRestylePrompt(baseInput);
    expect(prompt).toBe(
      [
        "Redesign this living room in a Scandinavian interior design style as a fully furnished, move-in-ready room.",
        structureLock,
        "Style direction — light woods, white walls, hygge textiles. Interpret this style faithfully and distinctly; do not default to a generic neutral staging.",
        "Remove moving boxes, trash, construction debris and clutter; replace them with furniture, rugs, lighting and decor that fit the existing geometry.",
        "Keep these items unchanged: none.",
        stagingLine,
      ].join("\n"),
    );
  });

  it("never instructs the model to change layout, floor or dimensions", () => {
    const prompt = buildRestylePrompt(baseInput);
    expect(prompt).toContain("Do not move, add, remove, resize or redraw windows");
    expect(prompt).toContain("floor layout, floor material, floor pattern");
    expect(prompt).not.toMatch(/change the (floor|layout|dimensions)/i);
    expect(prompt).not.toMatch(/new (floor|layout|windows)/i);
  });

  it("sends the style hint so styles do not converge", () => {
    const modern = buildRestylePrompt({
      ...baseInput,
      styleLabel: "Modern",
      styleHint: "clean lines, neutral palette, integrated lighting",
    });
    expect(modern).not.toBe(buildRestylePrompt(baseInput));
    expect(modern).toContain("clean lines, neutral palette, integrated lighting");
  });

  it("adds the renter clause and the keep list", () => {
    const prompt = buildRestylePrompt({
      ...baseInput,
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
  it("wraps the sanitized instruction and re-states the structure lock", () => {
    expect(buildEditPrompt("  replace   the sofa  ")).toBe(
      [
        "Apply only this change: replace the sofa.",
        "Keep everything else in the image identical, including the room structure, camera angle and all other objects.",
        "Never move, add, remove or resize windows, doors, walls, the floor or built-in features.",
        "The requested change must be clearly visible in the result.",
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
  it("varies furniture and decor only, while keeping the base", () => {
    const base = "Redesign this living room.";
    const prompts = [0, 1, 2, 3].map((index) => variationPrompt(base, index));
    expect(new Set(prompts).size).toBe(4);
    for (const prompt of prompts) {
      expect(prompt.startsWith(base)).toBe(true);
      expect(prompt).toContain("same architecture");
    }
  });
});
