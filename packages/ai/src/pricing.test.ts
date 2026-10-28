import { describe, expect, it } from "vitest";
import { computeCostMicros, pricingForModel } from "./pricing";

describe("pricing", () => {
  it("knows the GPT Image 2.5 rate card", () => {
    const pricing = pricingForModel("gpt-image-2.5-sunburst");
    expect(pricing.imageInputMicrosPerToken).toBe(8);
    expect(pricing.imageOutputMicrosPerToken).toBe(30);
    expect(pricing.textInputMicrosPerToken).toBe(5);
  });

  it("computes micros from token usage", () => {
    const { costMicros, usedFallback } = computeCostMicros(
      "gpt-image-2.5-sunburst",
      { inputTextTokens: 100, inputImageTokens: 1000, outputTokens: 2000 },
      1,
    );
    expect(usedFallback).toBe(false);
    expect(costMicros).toBe(100 * 5 + 1000 * 8 + 2000 * 30);
  });

  it("falls back per image when usage is missing", () => {
    const { costMicros, usedFallback } = computeCostMicros("gpt-image-2.5-flare", undefined, 3);
    expect(usedFallback).toBe(true);
    expect(costMicros).toBe(200_000 * 3);
  });

  it("uses the conservative fallback for unknown models", () => {
    const { costMicros } = computeCostMicros("some-future-model", undefined, 1);
    expect(costMicros).toBe(250_000);
  });
});
