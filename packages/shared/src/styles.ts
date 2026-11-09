export interface StyleDefinition {
  key: string;
  label: string;
  /** Sent to the image model as the style direction. */
  promptHint: string;
  /** Nine-room photographic preview atlas (3 � 3). */
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
    thumbnail: "/styles/previews/modern.webp",
    palette: ["#2f3437", "#d8d5cf", "#9aa3a8"],
    tags: ["neutral", "minimal", "sleek", "cool"],
  },
  {
    key: "contemporary",
    label: "Contemporary",
    promptHint: "current materials, soft curves, warm minimal palette",
    thumbnail: "/styles/previews/contemporary.webp",
    palette: ["#b7a99a", "#e8e2d9", "#5c5a55"],
    tags: ["neutral", "warm", "sleek"],
  },
  {
    key: "minimalist",
    label: "Minimalist",
    promptHint: "few objects, hidden storage, calm monochrome base",
    thumbnail: "/styles/previews/minimalist.webp",
    palette: ["#f2f0eb", "#cfcac1", "#3c3a37"],
    tags: ["minimal", "neutral", "airy"],
  },
  {
    key: "scandinavian",
    label: "Scandinavian",
    promptHint: "light woods, white walls, hygge textiles",
    thumbnail: "/styles/previews/scandinavian.webp",
    palette: ["#f5f1ea", "#c9a97e", "#8fa3a6"],
    tags: ["neutral", "warm", "wood", "airy"],
  },
  {
    key: "japandi",
    label: "Japandi",
    promptHint: "Japanese-Nordic mix, natural textures, low furniture, decluttered",
    thumbnail: "/styles/previews/japandi.webp",
    palette: ["#e9e4da", "#a58f75", "#4e4a43"],
    tags: ["minimal", "wood", "earthy", "calm"],
  },
  {
    key: "mid-century",
    label: "Mid-century",
    promptHint: "walnut furniture, tapered legs, retro accents",
    thumbnail: "/styles/previews/mid-century.webp",
    palette: ["#7b4b2a", "#e0c9a6", "#2f6d5f"],
    tags: ["wood", "warm", "retro", "color"],
  },
  {
    key: "industrial",
    label: "Industrial",
    promptHint: "exposed brick, metal accents, dark tones",
    thumbnail: "/styles/previews/industrial.webp",
    palette: ["#5a4a42", "#2b2b2b", "#a97c50"],
    tags: ["dark", "earthy", "raw", "cool"],
  },
  {
    key: "bohemian",
    label: "Bohemian",
    promptHint: "layered textiles, plants, eclectic patterns",
    thumbnail: "/styles/previews/bohemian.webp",
    palette: ["#c07a4e", "#e6d3b3", "#6b7f5b"],
    tags: ["eclectic", "earthy", "color", "warm"],
  },
  {
    key: "coastal",
    label: "Coastal",
    promptHint: "airy blues, linen, light wood, beach house feel",
    thumbnail: "/styles/previews/coastal.webp",
    palette: ["#dce8ea", "#f4f1ea", "#8fb3bd"],
    tags: ["airy", "cool", "warm", "wood"],
  },
  {
    key: "farmhouse",
    label: "Farmhouse",
    promptHint: "shaker details, rustic wood, soft whites",
    thumbnail: "/styles/previews/farmhouse.webp",
    palette: ["#f3efe6", "#b08968", "#6b705c"],
    tags: ["rustic", "warm", "wood", "neutral"],
  },
  {
    key: "traditional",
    label: "Traditional",
    promptHint: "classic mouldings, rich colours, symmetrical layout",
    thumbnail: "/styles/previews/traditional.webp",
    palette: ["#6d2f3b", "#d9c7a7", "#3a4a5a"],
    tags: ["rich", "warm", "classic", "dark"],
  },
  {
    key: "art-deco",
    label: "Art deco",
    promptHint: "geometric patterns, brass, deep jewel tones",
    thumbnail: "/styles/previews/art-deco.webp",
    palette: ["#0f2a34", "#c9a227", "#7a1f3d"],
    tags: ["luxe", "rich", "dark", "color"],
  },
  {
    key: "indian-contemporary",
    label: "Indian contemporary",
    promptHint: "warm earth tones, carved wood, block prints, layered textiles",
    thumbnail: "/styles/previews/indian-contemporary.webp",
    palette: ["#b5651d", "#efe2c9", "#7c2d12"],
    tags: ["earthy", "warm", "color", "wood"],
  },
  {
    key: "mediterranean",
    label: "Mediterranean",
    promptHint: "terracotta, white plaster, arches, natural fibres",
    thumbnail: "/styles/previews/mediterranean.webp",
    palette: ["#f4ede1", "#c96f4a", "#5f7d6a"],
    tags: ["earthy", "warm", "airy", "rustic"],
  },
  {
    key: "indian-heritage",
    label: "Indian heritage",
    promptHint: "rich teak, restrained carved details, brass lamps, jewel-tone handwoven textiles",
    thumbnail: "/styles/previews/indian-heritage.webp",
    palette: ["#663d29", "#ba863f", "#922f3e"],
    tags: ["warm", "natural"],
  },
  {
    key: "indian-minimal",
    label: "Indian minimal",
    promptHint: "quiet limewash, pale stone, simple teak furniture, sparse handloom cotton accents",
    thumbnail: "/styles/previews/indian-minimal.webp",
    palette: ["#e8dfd0", "#ab8560", "#5d6450"],
    tags: ["warm", "natural"],
  },
  {
    key: "indian-craft",
    label: "Indian craft",
    promptHint:
      "cane furniture, block-printed cotton, terracotta, handmade ceramics and woven textures",
    thumbnail: "/styles/previews/indian-craft.webp",
    palette: ["#c36e45", "#dfc5a0", "#356d71"],
    tags: ["warm", "natural"],
  },
  {
    key: "tropical-asian",
    label: "Tropical Asian",
    promptHint: "teak and rattan, airy linen, woven screens, restrained lush greenery",
    thumbnail: "/styles/previews/tropical-asian.webp",
    palette: ["#7b5638", "#d8d0b0", "#435b3d"],
    tags: ["warm", "natural"],
  },
  {
    key: "middle-eastern-contemporary",
    label: "Middle Eastern contemporary",
    promptHint:
      "warm travertine, sand tones, sculptural seating, restrained brass and geometric textiles",
    thumbnail: "/styles/previews/middle-eastern-contemporary.webp",
    palette: ["#d9c3a5", "#8f785e", "#b39257"],
    tags: ["warm", "natural"],
  },
  {
    key: "middle-eastern-heritage",
    label: "Middle Eastern heritage",
    promptHint: "intricate geometric tile accents, walnut, patterned rugs, warm lantern lighting",
    thumbnail: "/styles/previews/middle-eastern-heritage.webp",
    palette: ["#195d65", "#ad6e38", "#dbc8a5"],
    tags: ["warm", "natural"],
  },
  {
    key: "african-contemporary",
    label: "African contemporary",
    promptHint:
      "sculptural dark wood furniture, bold abstract textiles, warm clay and cream, woven accents",
    thumbnail: "/styles/previews/african-contemporary.webp",
    palette: ["#4e3528", "#c38251", "#e4d5bd"],
    tags: ["warm", "natural"],
  },
  {
    key: "earthy-craft",
    label: "Earthy craft",
    promptHint:
      "ochre limewash, handwoven baskets, simple timber furniture and tactile natural fibres",
    thumbnail: "/styles/previews/earthy-craft.webp",
    palette: ["#aa6e37", "#c4a776", "#685b3e"],
    tags: ["warm", "natural"],
  },
  {
    key: "latin-contemporary",
    label: "Latin contemporary",
    promptHint:
      "warm modern timber, handmade terracotta, cobalt and coral accents, graphic woven textiles",
    thumbnail: "/styles/previews/latin-contemporary.webp",
    palette: ["#bd5c45", "#285d92", "#ead5af"],
    tags: ["warm", "natural"],
  },
  {
    key: "tropical-latin",
    label: "Tropical Latin",
    promptHint:
      "vibrant botanical accents, cane furniture, green and sunny yellow textiles, terracotta",
    thumbnail: "/styles/previews/tropical-latin.webp",
    palette: ["#46704b", "#d9aa3c", "#d7b18d"],
    tags: ["warm", "natural"],
  },
  {
    key: "pacific-natural",
    label: "Pacific natural",
    promptHint:
      "pale timber, linen, woven natural fibres, calm stone colours, relaxed contemporary forms",
    thumbnail: "/styles/previews/pacific-natural.webp",
    palette: ["#d4c3a8", "#ece8df", "#8b9b8c"],
    tags: ["warm", "natural"],
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
