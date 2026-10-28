export interface RoomNeedsInput {
  roomType: string;
  widthMm: number | null;
  lengthMm: number | null;
}

export interface RoomNeed {
  key: string;
  label: string;
  /** Human size guidance, already resolved for the room's dimensions. */
  sizeGuide: string;
  /** Suggested share of the furnishing budget (basis points, sums to <=10000). */
  budgetShareBps: number;
}

interface Rule {
  key: string;
  label: string;
  budgetShareBps: number;
  size: (widthM: number | null, lengthM: number | null, areaM2: number | null) => string;
}

const widthAtLeast = (widthM: number | null): number => widthM ?? 3.5;
const areaOf = (widthM: number | null, lengthM: number | null): number | null =>
  widthM !== null && lengthM !== null ? Math.round(widthM * lengthM * 100) / 100 : null;

function rugFor(areaM2: number | null): string {
  if (areaM2 === null) return "Rug ~200 × 300 cm";
  if (areaM2 >= 25) return "Rug 240 × 340 cm or larger";
  if (areaM2 >= 15) return "Rug 200 × 300 cm";
  return "Rug 160 × 230 cm";
}

function sofaFor(widthM: number): string {
  if (widthM >= 4) return "Sofa 2.4–2.8 m, plus armchair";
  if (widthM >= 3.5) return "Sofa 2.0–2.4 m";
  return "Compact sofa or loveseat 1.6–1.9 m";
}

const RULES: Record<string, Rule[]> = {
  LIVING_ROOM: [
    {
      key: "sofa",
      label: "Sofa",
      budgetShareBps: 4200,
      size: (widthM) => sofaFor(widthAtLeast(widthM)),
    },
    {
      key: "rug",
      label: "Area rug",
      budgetShareBps: 1200,
      size: (_w, _l, area) => rugFor(area),
    },
    {
      key: "coffee-table",
      label: "Coffee table",
      budgetShareBps: 1000,
      size: (widthM) => (widthAtLeast(widthM) >= 3.5 ? "110–130 × 60 cm" : "90 × 50 cm"),
    },
    {
      key: "tv-unit",
      label: "TV / media unit",
      budgetShareBps: 1400,
      size: () => "Wall width up to 1.8 m, 40 cm deep",
    },
    {
      key: "lighting",
      label: "Floor or table lamp",
      budgetShareBps: 800,
      size: () => "Height 150–170 cm next to the sofa",
    },
    {
      key: "curtains",
      label: "Curtains",
      budgetShareBps: 800,
      size: () => "1.5–2× window width, floor length",
    },
    {
      key: "decor",
      label: "Art and decor",
      budgetShareBps: 600,
      size: () => "Gallery wall 1.2–1.6 m wide above the sofa",
    },
  ],
  BEDROOM: [
    { key: "bed", label: "Bed", budgetShareBps: 4500, size: (w) => (widthAtLeast(w) >= 3.2 ? "Queen/king 160–180 × 200 cm" : "Double 140 × 200 cm") },
    { key: "nightstands", label: "Nightstands", budgetShareBps: 1000, size: () => "2 × 45–55 cm wide" },
    { key: "wardrobe", label: "Wardrobe", budgetShareBps: 2500, size: (_w, l) => (l !== null && l >= 3.5 ? "2.0–2.4 m wide" : "1.6–1.8 m wide") },
    { key: "rug", label: "Rug", budgetShareBps: 700, size: (_w, _l, area) => rugFor(area) },
    { key: "curtains", label: "Curtains", budgetShareBps: 600, size: () => "Blackout, 1.5–2× window width" },
    { key: "lighting", label: "Bedside lighting", budgetShareBps: 700, size: () => "2 × 40–50 cm tall" },
  ],
  KITCHEN: [
    { key: "cabinet-refresh", label: "Cabinet refresh", budgetShareBps: 5000, size: () => "Existing cabinet fronts only" },
    { key: "lighting", label: "Task lighting", budgetShareBps: 2000, size: () => "Under-cabinet strip + 2 pendants" },
    { key: "decor", label: "Decor and textiles", budgetShareBps: 1500, size: () => "Runner 60 × 180 cm, plants, canisters" },
    { key: "stools", label: "Stools / seating", budgetShareBps: 1500, size: () => "2 × 45 cm seat height" },
  ],
  BATHROOM: [
    { key: "mirror", label: "Mirror", budgetShareBps: 3000, size: () => "60–90 cm wide above the vanity" },
    { key: "lighting", label: "Vanity lighting", budgetShareBps: 2500, size: () => "2 wall sconces or one bar" },
    { key: "textiles", label: "Textiles", budgetShareBps: 2000, size: () => "Bath mat 50 × 80 cm, towels" },
    { key: "storage", label: "Storage", budgetShareBps: 2500, size: () => "Slim 30–40 cm deep shelf or cabinet" },
  ],
  HOME_OFFICE: [
    { key: "desk", label: "Desk", budgetShareBps: 4000, size: (w) => (widthAtLeast(w) >= 3 ? "140–160 × 70 cm" : "110–120 × 60 cm") },
    { key: "chair", label: "Chair", budgetShareBps: 2500, size: () => "Ergonomic, 45–50 cm seat height" },
    { key: "storage", label: "Shelving", budgetShareBps: 2000, size: () => "80–120 cm wide, 30 cm deep" },
    { key: "lighting", label: "Task lamp", budgetShareBps: 900, size: () => "Arm reach 60 cm" },
    { key: "decor", label: "Plants and art", budgetShareBps: 600, size: () => "One statement plant 120–150 cm" },
  ],
};

const GENERIC_RULES: Rule[] = [
  { key: "furniture", label: "Main furniture piece", budgetShareBps: 5000, size: (w) => (widthAtLeast(w) >= 3.5 ? "Up to 2.2 m wide" : "Up to 1.7 m wide") },
  { key: "lighting", label: "Lighting", budgetShareBps: 2000, size: () => "One ceiling or floor fixture" },
  { key: "decor", label: "Decor and textiles", budgetShareBps: 2000, size: () => "Rug, cushions, art" },
  { key: "storage", label: "Storage", budgetShareBps: 1000, size: () => "Slim cabinet or shelf" },
];

/** Shopping list: item types and typical sizes derived from room dimensions. */
export function roomNeeds(input: RoomNeedsInput): RoomNeed[] {
  const widthM = input.widthMm !== null ? input.widthMm / 1000 : null;
  const lengthM = input.lengthMm !== null ? input.lengthMm / 1000 : null;
  const area = areaOf(widthM, lengthM);
  const rules = RULES[input.roomType] ?? GENERIC_RULES;
  return rules.map((rule) => ({
    key: rule.key,
    label: rule.label,
    sizeGuide: rule.size(widthM, lengthM, area),
    budgetShareBps: rule.budgetShareBps,
  }));
}

/** Typical room dimensions (mm) used when the user doesn't know theirs. */
export const TYPICAL_ROOM_SIZES: Record<string, { widthMm: number; lengthMm: number; heightMm: number }> = {
  LIVING_ROOM: { widthMm: 4000, lengthMm: 5000, heightMm: 2700 },
  BEDROOM: { widthMm: 3500, lengthMm: 4000, heightMm: 2700 },
  KITCHEN: { widthMm: 3000, lengthMm: 3600, heightMm: 2700 },
  BATHROOM: { widthMm: 2000, lengthMm: 2400, heightMm: 2500 },
  DINING_ROOM: { widthMm: 3200, lengthMm: 3800, heightMm: 2700 },
  HOME_OFFICE: { widthMm: 3000, lengthMm: 3200, heightMm: 2700 },
  KIDS_ROOM: { widthMm: 3200, lengthMm: 3600, heightMm: 2700 },
  BALCONY: { widthMm: 1500, lengthMm: 3000, heightMm: 2700 },
  HALLWAY: { widthMm: 1500, lengthMm: 3000, heightMm: 2700 },
  OTHER: { widthMm: 3500, lengthMm: 4000, heightMm: 2700 },
};

export function typicalSizeFor(roomType: string) {
  return TYPICAL_ROOM_SIZES[roomType] ?? TYPICAL_ROOM_SIZES.OTHER ?? { widthMm: 3500, lengthMm: 4000, heightMm: 2700 };
}
