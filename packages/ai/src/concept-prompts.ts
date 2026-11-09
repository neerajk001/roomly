export interface ConceptDirection {
  label: string;
  palette: readonly string[];
  materials: string;
  furniture: string;
  textiles: string;
  lighting: string;
}

export function buildConceptPrompt(
  base: string,
  direction: ConceptDirection,
  others: readonly ConceptDirection[],
  replacement = false,
): string {
  return [
    base,
    `CONCEPT DIRECTION: ${direction.label}. Make this a distinct, coherent design rather than a colour-filter variation.`,
    `Palette hierarchy for changeable furniture, textiles and decor: dominant ${direction.palette[0] ?? "neutral"}, supporting ${direction.palette[1] ?? "natural"}, accent ${direction.palette[2] ?? "contrasting"}.`,
    `Materials: ${direction.materials}.`,
    `Furniture forms: ${direction.furniture}.`,
    `Textiles and styling: ${direction.textiles}.`,
    `Lighting mood: ${direction.lighting}.`,
    `Other concepts in this set explore: ${others.map((other) => `${other.label} (${other.furniture}; ${other.textiles}; ${other.lighting})`).join(" | ") || "no alternatives"}. Do not repeat those furniture silhouettes, textile treatment and lighting mood.`,
    replacement
      ? "DIVERSITY REPLACEMENT: the earlier attempt looked too similar. Reinterpret this same direction with clearly different loose-furniture silhouettes, rug/textile design, art and portable lighting. Do not merely recolour the previous composition."
      : "",
    "The selected style, user notes, budget direction, keep-items, renter restrictions and structural constraints above take priority over this creative direction. Adapt these ideas within that style and the selected room's function. Never alter fixed finishes, floor, built-ins, camera or architecture to create variety. Differences must come from movable furniture and decor; do not write labels into the image.",
  ]
    .filter(Boolean)
    .join("\n");
}
