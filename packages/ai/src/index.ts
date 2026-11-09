import { getServerEnv } from "@roomdesigner/config/env";
import { createFakeProvider } from "./fake";
import { createOpenAIProvider } from "./openai";
import type { ImageProvider } from "./types";

/** Chooses the provider from env. The real provider is behind the spend guard at the service layer. */
export function getImageProvider(): ImageProvider {
  const env = getServerEnv();
  if (env.IMAGE_PROVIDER === "openai") {
    if (env.OPENAI_API_KEY === undefined || env.OPENAI_API_KEY === "") {
      throw new Error("IMAGE_PROVIDER=openai requires OPENAI_API_KEY");
    }
    return createOpenAIProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_IMAGE_MODEL ?? "gpt-image-2.5-sunburst",
    });
  }
  return createFakeProvider();
}

export { createFakeProvider } from "./fake";
export { buildConceptPrompt, type ConceptDirection } from "./concept-prompts";
export {
  getConceptAdviceProvider,
  createDemoAdviceProvider,
  createOpenAIAdviceProvider,
  CONCEPT_ADVICE_INSTRUCTIONS,
  type ConceptAdviceProvider,
  type AdviceContext,
} from "./concept-advice";
export { classifyProviderError, createOpenAIProvider } from "./openai";
export {
  PRICING,
  computeCostMicros,
  pricingForModel,
  CONSERVATIVE_IMAGE_COST_MICROS,
} from "./pricing";
export {
  MAX_INSTRUCTION_LENGTH,
  VARIATION_EMPHASES,
  buildEditPrompt,
  buildRestylePrompt,
  sanitizeInstruction,
  variationPrompt,
} from "./prompts";
export {
  ProviderError,
  type EditInput,
  type EditResult,
  type ImageProvider,
  type ImageQuality,
  type ImageSize,
} from "./types";
