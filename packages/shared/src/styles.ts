export interface StyleDefinition {
  key: string;
  label: string;
  promptHint: string;
  thumbnail: string;
}

/** Starter style set (04-ai-pipeline.md). Thumbnail paths are placeholders until art lands. */
export const STYLES: readonly StyleDefinition[] = [
  {
    key: "modern",
    label: "Modern",
    promptHint: "clean lines, neutral palette, integrated lighting",
    thumbnail: "/styles/modern.jpg",
  },
  {
    key: "contemporary",
    label: "Contemporary",
    promptHint: "current materials, soft curves, warm minimal palette",
    thumbnail: "/styles/contemporary.jpg",
  },
  {
    key: "minimalist",
    label: "Minimalist",
    promptHint: "few objects, hidden storage, calm monochrome base",
    thumbnail: "/styles/minimalist.jpg",
  },
  {
    key: "scandinavian",
    label: "Scandinavian",
    promptHint: "light woods, white walls, hygge textiles",
    thumbnail: "/styles/scandinavian.jpg",
  },
  {
    key: "japandi",
    label: "Japandi",
    promptHint: "Japanese-Nordic mix, natural textures, low furniture, decluttered",
    thumbnail: "/styles/japandi.jpg",
  },
  {
    key: "mid-century",
    label: "Mid-century",
    promptHint: "walnut furniture, tapered legs, retro accents",
    thumbnail: "/styles/mid-century.jpg",
  },
  {
    key: "industrial",
    label: "Industrial",
    promptHint: "exposed brick, metal accents, dark tones",
    thumbnail: "/styles/industrial.jpg",
  },
  {
    key: "bohemian",
    label: "Bohemian",
    promptHint: "layered textiles, plants, eclectic patterns",
    thumbnail: "/styles/bohemian.jpg",
  },
  {
    key: "coastal",
    label: "Coastal",
    promptHint: "airy blues, linen, light wood, beach house feel",
    thumbnail: "/styles/coastal.jpg",
  },
  {
    key: "farmhouse",
    label: "Farmhouse",
    promptHint: "shaker details, rustic wood, soft whites",
    thumbnail: "/styles/farmhouse.jpg",
  },
  {
    key: "traditional",
    label: "Traditional",
    promptHint: "classic mouldings, rich colours, symmetrical layout",
    thumbnail: "/styles/traditional.jpg",
  },
  {
    key: "art-deco",
    label: "Art deco",
    promptHint: "geometric patterns, brass, deep jewel tones",
    thumbnail: "/styles/art-deco.jpg",
  },
  {
    key: "indian-contemporary",
    label: "Indian contemporary",
    promptHint: "warm earth tones, carved wood, block prints, layered textiles",
    thumbnail: "/styles/indian-contemporary.jpg",
  },
  {
    key: "mediterranean",
    label: "Mediterranean",
    promptHint: "terracotta, white plaster, arches, natural fibres",
    thumbnail: "/styles/mediterranean.jpg",
  },
];

export function getStyle(key: string): StyleDefinition | undefined {
  return STYLES.find((style) => style.key === key);
}
