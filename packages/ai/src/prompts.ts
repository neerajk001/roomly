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
  keepList: string[];
  renterMode: boolean;
}

const RENTER_CLAUSE =
  "Only change things a renter can change without construction: wall paint, rugs, curtains, lighting fixtures, furniture and decor. Do not change flooring, windows, doors, built-in cabinets or room structure.";

/** RESTYLE prompt, exactly as specified in 04-ai-pipeline.md. */
export function buildRestylePrompt(input: RestylePromptInput): string {
  const keepList = input.keepList.length > 0 ? input.keepList.join(", ") : "none";
  const renterClause = input.renterMode ? `${RENTER_CLAUSE}\n` : "";
  return [
    `Redesign this ${input.roomTypeLabel} in a ${input.styleLabel} interior design style.`,
    "Keep the room's structure exactly as in the photo: walls, windows, doors, ceiling, camera angle and perspective.",
    `Keep these items unchanged: ${keepList}.`,
    renterClause.trimEnd(),
    "Photorealistic interior photograph with natural lighting. No text, logos or watermarks.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** EDIT prompt, exactly as specified in 04-ai-pipeline.md. */
export function buildEditPrompt(instruction: string): string {
  return [
    `Apply only this change: ${sanitizeInstruction(instruction)}.`,
    "Keep everything else in the image identical, including the room structure, camera angle and all other objects.",
  ].join("\n");
}
