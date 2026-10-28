// Shared zod schemas, constants (styles, plans, credits), types.
// This barrel must stay free of side effects and Node-only IO: it is imported
// by client components too. Server-only modules live behind subpath exports
// (e.g. "@roomdesigner/shared/email") and must be imported directly.
export { DISPOSABLE_EMAIL_DOMAINS, isDisposableEmail } from "./disposable-email";
export { CURRENCIES, isSupportedCurrency } from "./currencies";
export { STYLES, getStyle, type StyleDefinition } from "./styles";
export {
  CREDIT_COST,
  MAX_VARIATIONS,
  MIN_VARIATIONS,
  costPerVariation,
  totalCreditCost,
  type RenderQuality,
} from "./credits";
export {
  QUEUE_CLEANUP_UNCONFIRMED,
  QUEUE_RENDER_GENERATE,
  RENDER_QUEUE_OPTIONS,
  RENDER_QUEUE_RETRY_LIMIT,
  renderJobPayloadSchema,
  type RenderJobPayload,
} from "./jobs";
