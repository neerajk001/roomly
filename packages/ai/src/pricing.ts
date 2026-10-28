/**
 * Provider/model pricing used to compute `costMicros` (USD × 1,000,000).
 *
 * Source: OpenAI pricing page, "Image generation" section, checked 2026-10-28.
 * https://platform.openai.com/docs/pricing#image-generation
 * GPT Image 2.5 (Sunburst/Flare) token rates: $8/M image input tokens,
 * $30/M image output tokens, $5/M text input tokens.
 *
 * Because 1 USD = 1,000,000 micros, the micros-per-token value equals the
 * USD-per-million-token value. Prices change here only.
 */
export interface ModelPricing {
  readonly model: string;
  readonly imageInputMicrosPerToken: number;
  readonly imageOutputMicrosPerToken: number;
  readonly textInputMicrosPerToken: number;
  /** Conservative per-image fallback when the provider omits usage data. */
  readonly fallbackMicrosPerImage: number;
}

export const PRICING: readonly ModelPricing[] = [
  {
    model: "gpt-image-2.5-sunburst",
    imageInputMicrosPerToken: 8,
    imageOutputMicrosPerToken: 30,
    textInputMicrosPerToken: 5,
    fallbackMicrosPerImage: 250_000,
  },
  {
    model: "gpt-image-2.5-flare",
    imageInputMicrosPerToken: 8,
    imageOutputMicrosPerToken: 30,
    textInputMicrosPerToken: 5,
    fallbackMicrosPerImage: 200_000,
  },
];

export function pricingForModel(model: string): ModelPricing {
  const known = PRICING.find((entry) => entry.model === model);
  if (known !== undefined) return known;
  // Unknown model: conservative fallback (most expensive known rate).
  return {
    model,
    imageInputMicrosPerToken: 8,
    imageOutputMicrosPerToken: 30,
    textInputMicrosPerToken: 5,
    fallbackMicrosPerImage: 250_000,
  };
}

export interface TokenUsage {
  inputTextTokens?: number;
  inputImageTokens?: number;
  outputTokens?: number;
}

/**
 * Computes cost in micros. Returns the flat fallback (and `usedFallback: true`)
 * when no token usage is available.
 */
export function computeCostMicros(
  model: string,
  usage: TokenUsage | undefined,
  imageCount: number,
): { costMicros: number; usedFallback: boolean } {
  const pricing = pricingForModel(model);
  const hasUsage =
    usage !== undefined &&
    (usage.inputTextTokens !== undefined ||
      usage.inputImageTokens !== undefined ||
      usage.outputTokens !== undefined);

  if (!hasUsage) {
    return {
      costMicros: pricing.fallbackMicrosPerImage * Math.max(imageCount, 1),
      usedFallback: true,
    };
  }

  const cost =
    (usage?.inputTextTokens ?? 0) * pricing.textInputMicrosPerToken +
    (usage?.inputImageTokens ?? 0) * pricing.imageInputMicrosPerToken +
    (usage?.outputTokens ?? 0) * pricing.imageOutputMicrosPerToken;

  return { costMicros: Math.ceil(cost), usedFallback: false };
}
