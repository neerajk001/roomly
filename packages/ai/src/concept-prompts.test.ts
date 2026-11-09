import { describe, expect, it } from "vitest";
import { buildConceptPrompt, type ConceptDirection } from "./concept-prompts";
import { buildRestylePrompt } from "./prompts";

const direction: ConceptDirection = {
  label: "Light & open",
  palette: ["#eeeedd", "#554433", "#224466"],
  materials: "matte oak",
  furniture: "slim open-legged forms",
  textiles: "plain linen",
  lighting: "diffuse lamps",
};
const other = {
  ...direction,
  label: "Bold & expressive",
  furniture: "angular statement forms",
  textiles: "patterned rug",
  lighting: "directional portable lamps",
};

describe("concept prompt", () => {
  const base =
    buildRestylePrompt({
      roomTypeLabel: "bedroom",
      styleLabel: "Indian minimal",
      styleHint: "quiet limewash and teak",
      keepList: ["Bed"],
      renterMode: true,
    }) +
    "\nBudget direction: affordable furniture.\nAdditional notes: leave space for a reading chair";
  it("makes several explicit differences without erasing the base constraints", () => {
    const prompt = buildConceptPrompt(base, direction, [other]);
    expect(prompt.startsWith(base)).toBe(true);
    for (const text of [
      "matte oak",
      "slim open-legged forms",
      "plain linen",
      "diffuse lamps",
      "#eeeedd",
      "patterned rug",
      "Keep these items unchanged: Bed",
      "Only change things a renter",
      "affordable furniture",
      "reading chair",
      "take priority",
      "Never alter fixed finishes",
    ])
      expect(prompt).toContain(text);
    expect(buildConceptPrompt(base, other, [direction])).not.toBe(prompt);
  });
  it("strengthens only the duplicate slot while retaining the same style and source constraints", () => {
    const retry = buildConceptPrompt(base, direction, [other], true);
    expect(retry).toContain("DIVERSITY REPLACEMENT");
    expect(retry).toContain("Do not merely recolour");
    expect(retry.startsWith(base)).toBe(true);
    expect(buildConceptPrompt(base, direction, [other])).not.toContain("DIVERSITY REPLACEMENT");
  });
});
