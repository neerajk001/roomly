import pino from "pino";

/**
 * Structured JSON logger (server-only). Never log secrets, tokens, full emails,
 * signed URLs or image bytes; pass ids instead.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: process.env.SERVICE_NAME ?? "roomdesigner" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "secret",
      "apiKey",
      "email",
      "url",
    ],
    censor: "[redacted]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  data: Record<string, unknown> = {},
): void {
  logger[level]({ event, ...data }, event);
}
