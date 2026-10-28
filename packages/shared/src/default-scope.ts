import type { RateUnit } from "@roomdesigner/estimate";

/** Illustrative scope per room type. Keys must exist in rate-card-defaults. */
export type ScopeCategory =
  | "paint"
  | "ceiling"
  | "flooring"
  | "trim"
  | "lighting"
  | "curtains"
  | "furniture"
  | "decor"
  | "builtins";

export interface ScopeItem {
  itemKey: string;
  label: string;
  category: ScopeCategory;
  unit: RateUnit;
}

const LIVING: ScopeItem[] = [
  { itemKey: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL" },
  { itemKey: "ceiling-paint", label: "Paint ceiling", category: "ceiling", unit: "AREA_CEILING" },
  { itemKey: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR" },
  { itemKey: "skirting", label: "Skirting", category: "trim", unit: "LENGTH_PERIMETER" },
  { itemKey: "lighting-points", label: "Lighting points", category: "lighting", unit: "PER_UNIT" },
  { itemKey: "curtains", label: "Curtains", category: "curtains", unit: "LUMP_SUM" },
  { itemKey: "furniture", label: "Furniture package", category: "furniture", unit: "LUMP_SUM" },
  { itemKey: "decor", label: "Decor and art", category: "decor", unit: "LUMP_SUM" },
];

const BEDROOM: ScopeItem[] = [
  { itemKey: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL" },
  { itemKey: "ceiling-paint", label: "Paint ceiling", category: "ceiling", unit: "AREA_CEILING" },
  { itemKey: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR" },
  { itemKey: "curtains", label: "Curtains", category: "curtains", unit: "LUMP_SUM" },
  { itemKey: "lighting-points", label: "Lighting points", category: "lighting", unit: "PER_UNIT" },
  { itemKey: "furniture", label: "Furniture package", category: "furniture", unit: "LUMP_SUM" },
  { itemKey: "builtins", label: "Wardrobe / built-in", category: "builtins", unit: "LUMP_SUM" },
];

const KITCHEN: ScopeItem[] = [
  { itemKey: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL" },
  { itemKey: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR" },
  { itemKey: "cabinets-paint", label: "Refresh cabinets", category: "builtins", unit: "LUMP_SUM" },
  { itemKey: "lighting-points", label: "Lighting points", category: "lighting", unit: "PER_UNIT" },
];

const BATHROOM: ScopeItem[] = [
  { itemKey: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL" },
  { itemKey: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR" },
  { itemKey: "lighting-points", label: "Lighting points", category: "lighting", unit: "PER_UNIT" },
  { itemKey: "decor", label: "Fixtures and decor", category: "decor", unit: "LUMP_SUM" },
];

const OFFICE: ScopeItem[] = [
  { itemKey: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL" },
  { itemKey: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR" },
  { itemKey: "lighting-points", label: "Lighting points", category: "lighting", unit: "PER_UNIT" },
  { itemKey: "furniture", label: "Desk and storage", category: "furniture", unit: "LUMP_SUM" },
];

const GENERIC: ScopeItem[] = [
  { itemKey: "wall-paint", label: "Paint walls", category: "paint", unit: "AREA_WALL" },
  { itemKey: "flooring", label: "Flooring", category: "flooring", unit: "AREA_FLOOR" },
  { itemKey: "lighting-points", label: "Lighting points", category: "lighting", unit: "PER_UNIT" },
  { itemKey: "decor", label: "Decor and art", category: "decor", unit: "LUMP_SUM" },
];

const BY_ROOM: Record<string, ScopeItem[]> = {
  LIVING_ROOM: LIVING,
  BEDROOM: BEDROOM,
  KITCHEN: KITCHEN,
  BATHROOM: BATHROOM,
  DINING_ROOM: LIVING,
  HOME_OFFICE: OFFICE,
  KIDS_ROOM: BEDROOM,
  BALCONY: GENERIC,
  HALLWAY: GENERIC,
  OTHER: GENERIC,
};

/** Renter mode removes structural work: flooring, ceiling, built-ins, skirting. */
const RENTER_BLOCKED: ReadonlySet<ScopeCategory> = new Set(["flooring", "ceiling", "builtins", "trim"]);

export function defaultScopeFor(roomType: string, renterMode: boolean): ScopeItem[] {
  const scope = BY_ROOM[roomType] ?? GENERIC;
  return renterMode ? scope.filter((item) => !RENTER_BLOCKED.has(item.category)) : scope;
}

/**
 * Impact-per-cost weights (higher = more visible change per unit spent) used by
 * "what to change first". Static editorial values, not market data.
 */
export const CATEGORY_IMPACT: Record<ScopeCategory, number> = {
  paint: 10,
  decor: 8,
  lighting: 7,
  curtains: 6,
  furniture: 5,
  flooring: 4,
  builtins: 3,
  trim: 2,
  ceiling: 1,
};
