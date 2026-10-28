/** Credits charged per generated variation. Tune after measuring real costs (V5, gate G5). */
export const CREDIT_COST = {
  draft: 1, // quality "low" or "medium"
  final: 3, // quality "high" at the larger size
} as const;

export type RenderQuality = "draft" | "final";

export function costPerVariation(quality: RenderQuality): number {
  return quality === "final" ? CREDIT_COST.final : CREDIT_COST.draft;
}

export function totalCreditCost(quality: RenderQuality, variations: number): number {
  return costPerVariation(quality) * variations;
}

export const MAX_VARIATIONS = 4;
export const MIN_VARIATIONS = 1;
