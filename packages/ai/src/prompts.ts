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
 * RESTYLE prompt. Based on 04-ai-pipeline.md, extended for staging quality and
 * style differentiation (the style hint must reach the model, otherwise every
 * style converges to the same warm-neutral staging).
 */
export function buildRestylePrompt(input: RestylePromptInput): string {
  const keepList = input.keepList.length > 0 ? input.keepList.join(", ") : "none";
  const renterClause = input.renterMode ? `${RENTER_CLAUSE}\n` : "";
  return [
    `Redesign this ${input.roomTypeLabel} in a ${input.styleLabel} interior design style as a fully furnished, move-in-ready room.`,
    `Style direction — ${input.styleHint}. Interpret this style faithfully and distinctly; do not default to a generic neutral staging.`,
    "Keep the room's structure exactly as in the photo: walls, windows, doors, ceiling, camera angle, perspective and dimensions.",
    "Remove moving boxes, trash, construction debris and clutter; replace them with furniture, rugs, lighting and decor that fit the space.",
    `Keep these items unchanged: ${keepList}.`,
    renterClause.trimEnd(),
    "Photorealistic interior photograph, professional staging, realistic materials and surface textures (fabric, wood grain, stone, paint finish), soft natural daylight and believable shadows. No people, no text, logos or watermarks.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** EDIT prompt, exactly as specified in 04-ai-pipeline.md. */
export function buildEditPrompt(instruction: string): string {
  return [
    `Apply only this change: ${sanitizeInstruction(instruction)}.`,
    "Keep everything else in the image identical, including the room structure, camera angle and all other objects.",
    "Photorealistic result with consistent lighting and materials.",
  ].join("\n");
}

/**
 * Small, deterministic per-variation emphases so the four options don't come
 * back nearly identical. Kept within the chosen style.
 */
export const VARIATION_EMPHASES = [
  "a calm, uncluttered layout with fewer, larger pieces",
  "a richer, layered look with textiles, art and decor",
  "a lighter, airier material palette and more daylight",
  "deeper, moodier accents in the same style",
] as const;

export function variationPrompt(base: string, index: number): string {
  const emphasis = VARIATION_EMPHASES[index % VARIATION_EMPHASES.length];
  return `${base}\nVariation emphasis (stay in the same style): ${emphasis ?? ""}.`;
}
