export const MAX_INSTRUCTION_LENGTH = 300;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Trims, collapses whitespace and strips control characters from user text. */
export function sanitizeInstruction(raw: string): string {
  return raw
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INSTRUCTION_LENGTH);
}

export interface RestylePromptInput {
  roomTypeLabel: string;
  styleLabel: string;
  /** Style-specific direction from shared/styles.ts (palette, materials, mood). */
  styleHint: string;
  keepList: string[];
  renterMode: boolean;
}

const RENTER_CLAUSE =
  "Only change things a renter can change without construction: wall paint, rugs, curtains, lighting fixtures, furniture and decor. Do not change flooring, windows, doors, built-in cabinets or room structure.";

/**
 * Hard geometry lock. Architecture must stay pixel-identical; only loose
 * furniture, textiles, lighting and decor may change. Product rule: never move
 * windows, doors, walls or change the floor layout/dimensions.
 */
const STRUCTURE_LOCK = [
  "STRICT STRUCTURAL CONSTRAINTS — the room architecture must remain identical to the photo:",
  "- Do not move, add, remove, resize or redraw windows, doors, walls, ceilings, openings, radiators, built-in cabinets or mouldings.",
  "- Do not change the camera angle, perspective, framing or room dimensions.",
  "- The floor layout, floor material, floor pattern and floor direction stay exactly as photographed.",
  "- Only loose furniture, rugs, lighting fixtures, textiles, art and decor may change.",
].join("\n");

/**
 * RESTYLE prompt. Based on 04-ai-pipeline.md, extended for staging quality,
 * style differentiation and a strict structural lock (deviations in DECISIONS).
 */
export function buildRestylePrompt(input: RestylePromptInput): string {
  const keepList = input.keepList.length > 0 ? input.keepList.join(", ") : "none";
  const renterClause = input.renterMode ? `${RENTER_CLAUSE}\n` : "";
  return [
    `Redesign this ${input.roomTypeLabel} in a ${input.styleLabel} interior design style as a fully furnished, move-in-ready room.`,
    STRUCTURE_LOCK,
    `Style direction — ${input.styleHint}. Interpret this style faithfully and distinctly; do not default to a generic neutral staging.`,
    "Remove moving boxes, trash, construction debris and clutter; replace them with furniture, rugs, lighting and decor that fit the existing geometry.",
    `Keep these items unchanged: ${keepList}.`,
    renterClause.trimEnd(),
    "Photorealistic interior photograph, professional staging, realistic materials and surface textures (fabric, wood grain, stone, paint finish), soft natural daylight and believable shadows. No people, no text, logos or watermarks.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** EDIT prompt, exactly as specified in 04-ai-pipeline.md. */
export function buildEditPrompt(
  instruction: string,
  constraints?: { keepList: string[]; renterMode: boolean },
): string {
  return [
    `Apply only this change: ${sanitizeInstruction(instruction)}.`,
    "Keep everything else in the image identical, including the room structure, camera angle and all other objects.",
    "Never move, add, remove or resize windows, doors, walls, the floor or built-in features.",
    "The requested change must be clearly visible in the result.",
    "Photorealistic result with consistent lighting and materials.",
    ...(constraints
      ? [
          `Keep these items unchanged: ${constraints.keepList.join(", ") || "none"}.`,
          ...(constraints.renterMode ? [RENTER_CLAUSE] : []),
        ]
      : []),
  ].join("\n");
}

/**
 * Small, deterministic per-variation emphases so the four options don't come
 * back nearly identical. Furniture/decor only — never layout.
 */
export const VARIATION_EMPHASES = [
  "fewer, larger furniture pieces with restrained decor",
  "layered textiles, art and decorative objects",
  "lighter furniture finishes and brighter textiles",
  "deeper accent colours in upholstery and decor",
] as const;

export function variationPrompt(base: string, index: number): string {
  const emphasis = VARIATION_EMPHASES[index % VARIATION_EMPHASES.length];
  return `${base}\nFurniture and decor emphasis (same style, same architecture): ${emphasis ?? ""}.`;
}
