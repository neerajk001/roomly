import { z } from "zod";
import { getStyle, STYLES } from "./styles";

/** Curated starting points, not an exhaustive definition of regional design. */
export const DESIGN_TRADITIONS = [
  {
    key: "india",
    label: "India",
    description: "Warm woods, local craft and layered textiles",
    styles: ["indian-contemporary", "indian-heritage", "indian-minimal", "indian-craft"],
  },
  {
    key: "asia",
    label: "East & Southeast Asia",
    description: "Quiet spaces, natural textures and tropical greenery",
    styles: ["japandi", "minimalist", "tropical-asian"],
  },
  {
    key: "europe",
    label: "Europe",
    description: "Nordic simplicity, Mediterranean warmth and classic detail",
    styles: ["scandinavian", "mediterranean", "traditional", "art-deco"],
  },
  {
    key: "middle-east",
    label: "Middle East",
    description: "Warm stone, geometric detail and layered light",
    styles: ["middle-eastern-contemporary", "middle-eastern-heritage"],
  },
  {
    key: "africa",
    label: "Africa",
    description: "Earthy palettes, sculptural forms and woven textures",
    styles: ["african-contemporary", "earthy-craft"],
  },
  {
    key: "north-america",
    label: "North America",
    description: "Modern, mid-century and relaxed rustic directions",
    styles: ["modern", "contemporary", "mid-century", "industrial", "farmhouse"],
  },
  {
    key: "latin-america",
    label: "Latin America",
    description: "Expressive colour, handmade finishes and tropical warmth",
    styles: ["latin-contemporary", "tropical-latin"],
  },
  {
    key: "oceania",
    label: "Oceania",
    description: "Coastal light, natural fibres and open, relaxed spaces",
    styles: ["coastal", "pacific-natural"],
  },
  {
    key: "global",
    label: "Explore all styles",
    description: "Mix influences or let us choose a starting point",
    styles: STYLES.map((style) => style.key),
  },
] as const;

export const BUDGET_TIERS = [
  {
    key: "budget",
    label: "Budget-friendly",
    description: "Simple updates, practical finishes and reuse",
    hint: "Use affordable off-the-shelf furniture, durable economical finishes and reuse existing pieces where possible. Prioritize small high-impact changes.",
  },
  {
    key: "mid",
    label: "Mid-range",
    description: "A balance of quality and value",
    hint: "Balance durable quality furniture and accessible natural finishes with a few considered statement pieces.",
  },
  {
    key: "premium",
    label: "Premium",
    description: "Refined materials and statement pieces",
    hint: "Use refined materials, well-crafted furniture and thoughtful statement lighting; keep the room uncluttered.",
  },
] as const;

export const styleKeySchema = z
  .string()
  .max(64)
  .refine((key) => getStyle(key) !== undefined, "Choose a valid style.");
export const traditionKeySchema = z
  .string()
  .max(64)
  .refine(
    (key) => DESIGN_TRADITIONS.some((item) => item.key === key),
    "Choose a design tradition.",
  );
export const budgetTierSchema = z.enum(["budget", "mid", "premium"]);
export type BudgetTier = z.infer<typeof budgetTierSchema>;
export const designPreferencesSchema = z
  .object({
    styleKeys: z
      .array(styleKeySchema)
      .min(1)
      .max(3)
      .refine((keys) => new Set(keys).size === keys.length, "Choose each style once.")
      .optional(),
    traditionKey: traditionKeySchema.optional(),
    budgetTier: budgetTierSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const tradition = DESIGN_TRADITIONS.find((item) => item.key === value.traditionKey);
    if (
      tradition &&
      value.styleKeys?.some((key) => !(tradition.styles as readonly string[]).includes(key))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["styleKeys"],
        message: "Choose styles from your selected tradition.",
      });
    }
  });

export function stylesForTradition(key: string) {
  const tradition = DESIGN_TRADITIONS.find((item) => item.key === key);
  return STYLES.filter((style) =>
    (tradition?.styles as readonly string[] | undefined)?.includes(style.key),
  );
}

/** Legacy jobs have only styleKey; new jobs assign every chosen style to a slot. */
export function outputStyleKey(
  params: unknown,
  legacyKey: string | null,
  index: number,
): string | null {
  const parsed = designPreferencesSchema.safeParse(params);
  const keys = parsed.success ? parsed.data.styleKeys : undefined;
  return keys?.[index % keys.length] ?? legacyKey;
}

export const PREVIEW_ROOMS = [
  "LIVING_ROOM",
  "BEDROOM",
  "KITCHEN",
  "BATHROOM",
  "DINING_ROOM",
  "HOME_OFFICE",
  "KIDS_ROOM",
  "BALCONY",
  "HALLWAY",
] as const;

export function stylePreviewTile(roomType: string): { column: number; row: number } {
  const index = Math.max(
    0,
    PREVIEW_ROOMS.findIndex((room) => room === roomType),
  );
  return { column: index % 3, row: Math.floor(index / 3) };
}
