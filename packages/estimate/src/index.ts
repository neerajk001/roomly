/**
 * PURE estimate engine. No IO, no database, no floats for money.
 * All quantities are computed in hundredths (2 decimal places) and money in
 * integer minor units. See docs/spec/05-estimate-engine.md.
 */
export { parseDecimalHundredths, formatDecimalHundredths } from "./decimal-input";
export {
  displayRateMinor,
  parseDisplayRate,
  storedRateMinor,
  displayQuantity,
  storedQuantity,
  rateUnitLabel,
  sumEstimateTotals,
} from "./unit-display";

export type Opening = {
  type: "DOOR" | "WINDOW";
  widthMm: number;
  heightMm: number;
  qty: number;
};

export type RoomInput = {
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  openings: Opening[];
};

export type RateUnit =
  "AREA_FLOOR" | "AREA_CEILING" | "AREA_WALL" | "LENGTH_PERIMETER" | "PER_UNIT" | "LUMP_SUM";

export type RateItem = {
  key: string;
  label: string;
  category: string;
  unit: RateUnit;
  unitPriceMinor: number;
};

export type Selection = {
  itemKey: string;
  quantityOverride?: number;
};

export type Config = {
  currency: string;
  markupBps: number;
  taxBps: number;
  rangeBps?: number;
};

export type EstimateLine = {
  itemKey: string;
  label: string;
  category: string;
  unit: RateUnit;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
};

export type EstimateResult = {
  currency: string;
  lines: EstimateLine[];
  subtotalMinor: number;
  markupMinor: number;
  taxMinor: number;
  totalMinor: number;
  lowMinor?: number;
  highMinor?: number;
};

/** Exact half-up division for non-negative integers. */
function roundHalfUpDiv(numerator: number, denominator: number): number {
  if (denominator <= 0) throw new Error("roundHalfUpDiv: denominator must be positive");
  return Math.floor((numerator * 2 + denominator) / (2 * denominator));
}

export function rangeForTotal(
  totalMinor: number,
  rangeBps: number,
): { lowMinor: number; highMinor: number } {
  return {
    lowMinor: roundHalfUpDiv(totalMinor * (10000 - rangeBps), 10000),
    highMinor: roundHalfUpDiv(totalMinor * (10000 + rangeBps), 10000),
  };
}

/** Quantities are kept as integer hundredths to avoid float drift. */
function quantityHundredthsFromOverride(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("quantityOverride must be a non-negative number");
  }
  return roundHalfUpDiv(Math.round(value * 1_000_000), 10_000);
}

/** mm² → hundredths of a square metre. */
function areaHundredthsFromMm2(mm2: number): number {
  return roundHalfUpDiv(Math.max(0, Math.round(mm2)), 10_000);
}

/** mm → hundredths of a metre. */
function lengthHundredthsFromMm(mm: number): number {
  return roundHalfUpDiv(Math.max(0, Math.round(mm)), 10);
}

export type DerivedQuantities = {
  floorAreaM2: number;
  ceilingAreaM2: number;
  perimeterM: number;
  grossWallAreaM2: number;
  openingsAreaM2: number;
  wallAreaM2: number;
};

/** Human-readable derived quantities (2 dp), also used by tests and the UI. */
export function deriveQuantities(room: RoomInput): DerivedQuantities {
  const floorMm2 = room.widthMm * room.lengthMm;
  const perimeterMm = 2 * (room.widthMm + room.lengthMm);
  const grossWallMm2 = perimeterMm * room.heightMm;
  const openingsMm2 = room.openings.reduce(
    (sum, opening) => sum + opening.widthMm * opening.heightMm * opening.qty,
    0,
  );
  const wallMm2 = Math.max(0, grossWallMm2 - openingsMm2);
  return {
    floorAreaM2: areaHundredthsFromMm2(floorMm2) / 100,
    ceilingAreaM2: areaHundredthsFromMm2(floorMm2) / 100,
    perimeterM: lengthHundredthsFromMm(perimeterMm) / 100,
    grossWallAreaM2: areaHundredthsFromMm2(grossWallMm2) / 100,
    openingsAreaM2: areaHundredthsFromMm2(openingsMm2) / 100,
    wallAreaM2: areaHundredthsFromMm2(wallMm2) / 100,
  };
}

function quantityHundredthsFor(unit: RateUnit, room: RoomInput): number {
  const floorMm2 = room.widthMm * room.lengthMm;
  const perimeterMm = 2 * (room.widthMm + room.lengthMm);
  switch (unit) {
    case "AREA_FLOOR":
    case "AREA_CEILING":
      return areaHundredthsFromMm2(floorMm2);
    case "AREA_WALL": {
      const openingsMm2 = room.openings.reduce(
        (sum, opening) => sum + opening.widthMm * opening.heightMm * opening.qty,
        0,
      );
      return areaHundredthsFromMm2(Math.max(0, perimeterMm * room.heightMm - openingsMm2));
    }
    case "LENGTH_PERIMETER":
      return lengthHundredthsFromMm(perimeterMm);
    case "PER_UNIT":
      return 100;
    case "LUMP_SUM":
      return 100;
  }
}

/**
 * Computes an estimate. Unknown selections are ignored so a stale client never
 * breaks a quote; selection order defines line order.
 */
export function computeEstimate(
  room: RoomInput,
  items: RateItem[],
  selections: Selection[],
  config: Config,
): EstimateResult {
  const itemsByKey = new Map(items.map((item) => [item.key, item]));
  const lines: EstimateLine[] = [];

  for (const selection of selections) {
    const item = itemsByKey.get(selection.itemKey);
    if (item === undefined) continue;
    if (item.unitPriceMinor < 0) throw new Error(`Negative price for ${item.key}`);

    const qtyHundredths =
      selection.quantityOverride !== undefined
        ? quantityHundredthsFromOverride(selection.quantityOverride)
        : quantityHundredthsFor(item.unit, room);

    const totalMinor = roundHalfUpDiv(qtyHundredths * item.unitPriceMinor, 100);
    lines.push({
      itemKey: item.key,
      label: item.label,
      category: item.category,
      unit: item.unit,
      quantity: qtyHundredths / 100,
      unitPriceMinor: item.unitPriceMinor,
      totalMinor,
    });
  }

  const subtotalMinor = lines.reduce((sum, line) => sum + line.totalMinor, 0);
  const markupMinor = roundHalfUpDiv(subtotalMinor * config.markupBps, 10_000);
  const taxMinor = roundHalfUpDiv((subtotalMinor + markupMinor) * config.taxBps, 10_000);
  const totalMinor = subtotalMinor + markupMinor + taxMinor;

  const result: EstimateResult = {
    currency: config.currency,
    lines,
    subtotalMinor,
    markupMinor,
    taxMinor,
    totalMinor,
  };

  if (config.rangeBps !== undefined && config.rangeBps > 0) {
    result.lowMinor = roundHalfUpDiv(totalMinor * (10_000 - config.rangeBps), 10_000);
    result.highMinor = roundHalfUpDiv(totalMinor * (10_000 + config.rangeBps), 10_000);
  }

  return result;
}

export type EditableLine = {
  label: string;
  category: string;
  unit: RateUnit;
  quantity: number;
  unitPriceMinor: number;
};

/** Recomputes totals from hand-edited lines (Pro mode, V4). */
export function recompute(
  lines: EditableLine[],
  config: Config,
): Omit<EstimateResult, "lines"> & { lines: EstimateLine[] } {
  const computed: EstimateLine[] = lines.map((line, index) => {
    const qtyHundredths = quantityHundredthsFromOverride(line.quantity);
    return {
      itemKey: `line-${String(index)}`,
      label: line.label,
      category: line.category,
      unit: line.unit,
      quantity: qtyHundredths / 100,
      unitPriceMinor: line.unitPriceMinor,
      totalMinor: roundHalfUpDiv(qtyHundredths * Math.max(0, line.unitPriceMinor), 100),
    };
  });

  const subtotalMinor = computed.reduce((sum, line) => sum + line.totalMinor, 0);
  const markupMinor = roundHalfUpDiv(subtotalMinor * config.markupBps, 10_000);
  const taxMinor = roundHalfUpDiv((subtotalMinor + markupMinor) * config.taxBps, 10_000);
  const totalMinor = subtotalMinor + markupMinor + taxMinor;

  const result: Omit<EstimateResult, "lines"> & { lines: EstimateLine[] } = {
    currency: config.currency,
    lines: computed,
    subtotalMinor,
    markupMinor,
    taxMinor,
    totalMinor,
  };
  if (config.rangeBps !== undefined && config.rangeBps > 0) {
    result.lowMinor = roundHalfUpDiv(totalMinor * (10_000 - config.rangeBps), 10_000);
    result.highMinor = roundHalfUpDiv(totalMinor * (10_000 + config.rangeBps), 10_000);
  }
  return result;
}
export interface RankedChange {
  itemKey: string;
  label: string;
  category: string;
  estimatedCostMinor: number;
  /** Higher means more visible change per unit spent. */
  impactPerCostBps: number;
  fitsBudget: boolean;
}

/**
 * "What to change first": ranks estimate lines by static category impact
 * divided by cost. Budget (optional) marks the entries that fit when taken in
 * ranked order.
 */
export function rankChanges(
  lines: EstimateLine[],
  weights: Record<string, number>,
  budgetMinor?: number,
): RankedChange[] {
  const ranked = lines
    .map((line) => {
      const impact = weights[line.category] ?? 1;
      const cost = Math.max(0, line.totalMinor);
      return {
        itemKey: line.itemKey,
        label: line.label,
        category: line.category,
        estimatedCostMinor: cost,
        impactPerCostBps:
          cost === 0 ? Number.MAX_SAFE_INTEGER : roundHalfUpDiv(impact * 10_000, cost),
        fitsBudget: false,
      };
    })
    .sort((a, b) => b.impactPerCostBps - a.impactPerCostBps);

  if (budgetMinor !== undefined && budgetMinor > 0) {
    let remaining = budgetMinor;
    for (const change of ranked) {
      if (change.estimatedCostMinor <= remaining) {
        change.fitsBudget = true;
        remaining -= change.estimatedCostMinor;
      }
    }
  }
  return ranked;
}
