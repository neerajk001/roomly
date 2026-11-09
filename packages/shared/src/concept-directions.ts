import { z } from "zod";
import { stylesForTradition } from "./design-directions";
import { getStyle, type StyleDefinition } from "./styles";

// Ornament, furniture form and texture: editorial descriptors, not geography scores.
const ATTRIBUTES: Record<string, readonly [number, number, number]> = {
  modern: [0, 0, 0],
  contemporary: [0, 2, 1],
  minimalist: [0, 0, 0],
  scandinavian: [0, 1, 1],
  japandi: [0, 0, 1],
  "mid-century": [1, 1, 1],
  industrial: [0, 0, 2],
  bohemian: [2, 2, 2],
  coastal: [0, 1, 1],
  farmhouse: [1, 0, 2],
  traditional: [2, 1, 2],
  "art-deco": [2, 0, 0],
  "indian-contemporary": [1, 1, 1],
  "indian-heritage": [2, 0, 2],
  "indian-minimal": [0, 0, 0],
  "indian-craft": [1, 2, 2],
  "tropical-asian": [1, 1, 2],
  "middle-eastern-contemporary": [0, 2, 0],
  "middle-eastern-heritage": [2, 0, 2],
  "african-contemporary": [1, 2, 1],
  "earthy-craft": [1, 0, 2],
  "latin-contemporary": [1, 0, 1],
  "tropical-latin": [2, 2, 2],
  "pacific-natural": [0, 1, 1],
};

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

export function styleContrast(a: StyleDefinition, b: StyleDefinition): number {
  const traitsA = ATTRIBUTES[a.key] ?? [1, 1, 1];
  const traitsB = ATTRIBUTES[b.key] ?? [1, 1, 1];
  const traits =
    traitsA.reduce((sum, value, index) => sum + Math.abs(value - (traitsB[index] ?? 1)), 0) / 6;
  // Compare colour sets independent of swatch ordering.
  const directedColourDistance = (first: StyleDefinition, second: StyleDefinition) =>
    first.palette.reduce(
      (sum, colour) =>
        sum +
        Math.min(
          ...second.palette.map(
            (other) =>
              rgb(colour).reduce(
                (distance, value, index) => distance + Math.abs(value - (rgb(other)[index] ?? 0)),
                0,
              ) / 765,
          ),
        ),
      0,
    ) / 3;
  const colours = (directedColourDistance(a, b) + directedColourDistance(b, a)) / 2;
  return traits * 0.7 + colours * 0.3;
}

/** Start with the most contrasting pair, then maximize distance from every pick. */
export function recommendContrastingStyles(traditionKey: string, count = 3): string[] {
  const candidates = stylesForTradition(traditionKey);
  const limit = Math.min(3, Math.max(0, Math.trunc(count)), candidates.length);
  if (limit < 2) return candidates.slice(0, limit).map((style) => style.key);
  let pair: StyleDefinition[] = [];
  let best = -1;
  for (const [index, first] of candidates.entries()) {
    for (const second of candidates.slice(index + 1)) {
      const distance = styleContrast(first, second);
      if (distance > best) {
        best = distance;
        pair = [first, second];
      }
    }
  }
  while (pair.length < limit) {
    const ranked = candidates
      .filter((style) => !pair.includes(style))
      .map((style) => ({
        style,
        distance: Math.min(...pair.map((picked) => styleContrast(style, picked))),
      }))
      .sort((a, b) => b.distance - a.distance || a.style.key.localeCompare(b.style.key));
    const next = ranked[0];
    if (!next) break;
    pair.push(next.style);
  }
  return pair.map((style) => style.key);
}

const MOODS = [
  {
    label: "Light & open",
    materials: "lighter matte finishes on movable furniture, smooth natural fabrics",
    furniture: "slim open-legged silhouettes with generous visible space between loose pieces",
    textiles: "mostly plain upholstery, one large quiet rug, minimal decorative layering",
    lighting: "diffuse shaded table and floor lamps; bright, soft atmosphere",
  },
  {
    label: "Warm & tactile",
    materials:
      "warm mid-tone wood on loose pieces, textured fabric and tactile handcrafted accents",
    furniture: "rounded substantial silhouettes and a low, grounding centrepiece",
    textiles: "layered woven textures and soft tonal upholstery",
    lighting: "warm pools of light from low shaded portable lamps; intimate atmosphere",
  },
  {
    label: "Bold & expressive",
    materials:
      "contrasting finishes, sculptural ceramic and restrained reflective accents on loose pieces",
    furniture: "angular or sculptural statement silhouettes; a strong focal furniture piece",
    textiles: "a clearly patterned rug or textile and a confident accent-colour upholstery piece",
    lighting: "directional portable accent lighting on art or objects; dramatic focal contrast",
  },
  {
    label: "Deep & refined",
    materials:
      "deeper stained loose furniture, tailored textured upholstery and subtle metallic detailing",
    furniture: "structured tailored silhouettes with fewer substantial statement pieces",
    textiles: "deep tonal upholstery, crisp contrasts and restrained geometric textile accents",
    lighting:
      "layered portable task and ambient lamps; quiet evening-like mood while preserving the source daylight direction",
  },
] as const;

export function conceptDirectionFor(styleKey: string | null, index: number) {
  const style = getStyle(styleKey ?? "modern") ?? getStyle("modern");
  const palette = style?.palette ?? ["#d8d5cf", "#2f3437", "#9aa3a8"];
  const slot = Math.abs(Math.trunc(index)) % MOODS.length;
  const mood = MOODS[slot] ?? MOODS[0];
  return {
    ...mood,
    palette:
      slot === 0
        ? [palette[1], palette[0], palette[2]]
        : slot === 1
          ? [palette[0], palette[1], palette[2]]
          : slot === 2
            ? [palette[2], palette[1], palette[0]]
            : [palette[0], palette[2], palette[1]],
  };
}

export const diversityReportSchema = z.object({
  similarConcepts: z.boolean(),
  retryUsed: z.boolean(),
});
export function readDiversityReport(params: unknown) {
  const parsed = z.object({ diversityReport: diversityReportSchema }).safeParse(params);
  return parsed.success ? parsed.data.diversityReport : null;
}

export function outputConceptLabel(
  params: unknown,
  styleKey: string | null,
  index: number,
): string | undefined {
  return z.object({ conceptPlanVersion: z.literal(1) }).safeParse(params).success
    ? conceptDirectionFor(styleKey, index).label
    : undefined;
}
