export interface StyleDefinition {
  key: string;
  label: string;
  /** Sent to the image model as the style direction. */
  promptHint: string;
  /** Placeholder thumbnail path until real style art lands. */
  thumbnail: string;
  /** Three-colour palette used by the style quiz swatches and UI accents. */
  palette: readonly [string, string, string];
  /** Tags used by the style quiz to recommend styles. */
  tags: readonly string[];
}

export const STYLES: readonly StyleDefinition[] = [
  {
    key: "modern",
    label: "Modern",
    promptHint: "clean lines, neutral palette, integrated lighting",
    thumbnail: "/styles/modern.jpg",
    palette: ["#2f3437", "#d8d5cf", "#9aa3a8"],
    tags: ["neutral", "minimal", "sleek", "cool"],
  },
  {
    key: "contemporary",
    label: "Contemporary",
    promptHint: "current materials, soft curves, warm minimal palette",
    thumbnail: "/styles/contemporary.jpg",
    palette: ["#b7a99a", "#e8e2d9", "#5c5a55"],
    tags: ["neutral", "warm", "sleek"],
  },
  {
    key: "minimalist",
    label: "Minimalist",
    promptHint: "few objects, hidden storage, calm monochrome base",
    thumbnail: "/styles/minimalist.jpg",
    palette: ["#f2f0eb", "#cfcac1", "#3c3a37"],
    tags: ["minimal", "neutral", "airy"],
  },
  {
    key: "scandinavian",
    label: "Scandinavian",
    promptHint: "light woods, white walls, hygge textiles",
    thumbnail: "/styles/scandinavian.jpg",
    palette: ["#f5f1ea", "#c9a97e", "#8fa3a6"],
    tags: ["neutral", "warm", "wood", "airy"],
  },
  {
    key: "japandi",
    label: "Japandi",
    promptHint: "Japanese-Nordic mix, natural textures, low furniture, decluttered",
    thumbnail: "/styles/japandi.jpg",
    palette: ["#e9e4da", "#a58f75", "#4e4a43"],
    tags: ["minimal", "wood", "earthy", "calm"],
  },
  {
    key: "mid-century",
    label: "Mid-century",
    promptHint: "walnut furniture, tapered legs, retro accents",
    thumbnail: "/styles/mid-century.jpg",
    palette: ["#7b4b2a", "#e0c9a6", "#2f6d5f"],
    tags: ["wood", "warm", "retro", "color"],
  },
  {
    key: "industrial",
    label: "Industrial",
    promptHint: "exposed brick, metal accents, dark tones",
    thumbnail: "/styles/industrial.jpg",
    palette: ["#5a4a42", "#2b2b2b", "#a97c50"],
    tags: ["dark", "earthy", "raw", "cool"],
  },
  {
    key: "bohemian",
    label: "Bohemian",
    promptHint: "layered textiles, plants, eclectic patterns",
    thumbnail: "/styles/bohemian.jpg",
    palette: ["#c07a4e", "#e6d3b3", "#6b7f5b"],
    tags: ["eclectic", "earthy", "color", "warm"],
  },
  {
    key: "coastal",
    label: "Coastal",
    promptHint: "airy blues, linen, light wood, beach house feel",
    thumbnail: "/styles/coastal.jpg",
    palette: ["#dce8ea", "#f4f1ea", "#8fb3bd"],
    tags: ["airy", "cool", "warm", "wood"],
  },
  {
    key: "farmhouse",
    label: "Farmhouse",
    promptHint: "shaker details, rustic wood, soft whites",
    thumbnail: "/styles/farmhouse.jpg",
    palette: ["#f3efe6", "#b08968", "#6b705c"],
    tags: ["rustic", "warm", "wood", "neutral"],
  },
  {
    key: "traditional",
    label: "Traditional",
    promptHint: "classic mouldings, rich colours, symmetrical layout",
    thumbnail: "/styles/traditional.jpg",
    palette: ["#6d2f3b", "#d9c7a7", "#3a4a5a"],
    tags: ["rich", "warm", "classic", "dark"],
  },
  {
    key: "art-deco",
    label: "Art deco",
    promptHint: "geometric patterns, brass, deep jewel tones",
    thumbnail: "/styles/art-deco.jpg",
    palette: ["#0f2a34", "#c9a227", "#7a1f3d"],
    tags: ["luxe", "rich", "dark", "color"],
  },
  {
    key: "indian-contemporary",
    label: "Indian contemporary",
    promptHint: "warm earth tones, carved wood, block prints, layered textiles",
    thumbnail: "/styles/indian-contemporary.jpg",
    palette: ["#b5651d", "#efe2c9", "#7c2d12"],
    tags: ["earthy", "warm", "color", "wood"],
  },
  {
    key: "mediterranean",
    label: "Mediterranean",
    promptHint: "terracotta, white plaster, arches, natural fibres",
    thumbnail: "/styles/mediterranean.jpg",
    palette: ["#f4ede1", "#c96f4a", "#5f7d6a"],
    tags: ["earthy", "warm", "airy", "rustic"],
  },
];

export function getStyle(key: string): StyleDefinition | undefined {
  return STYLES.find((style) => style.key === key);
}

/** Six visually contrasting pairs for the style quiz (one pick per pair). */
export const STYLE_QUIZ_PAIRS: readonly (readonly [string, string])[] = [
  ["scandinavian", "industrial"],
  ["minimalist", "bohemian"],
  ["coastal", "mid-century"],
  ["japandi", "art-deco"],
  ["farmhouse", "contemporary"],
  ["mediterranean", "traditional"],
];

/**
 * Recommends the top style keys from the user's quiz picks by tag overlap
 * (plus a bonus for directly picked styles).
 */
export function recommendStyles(pickedKeys: readonly string[]): string[] {
  const picked = pickedKeys
    .map((key) => getStyle(key))
    .filter((style): style is StyleDefinition => style !== undefined);
  const scores = new Map<string, number>();
  for (const style of picked) {
    scores.set(style.key, (scores.get(style.key) ?? 0) + 5);
    for (const candidate of STYLES) {
      const overlap = candidate.tags.filter((tag) => style.tags.includes(tag)).length;
      scores.set(candidate.key, (scores.get(candidate.key) ?? 0) + overlap);
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([key]) => key);
}
