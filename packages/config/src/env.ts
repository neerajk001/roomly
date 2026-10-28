import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/** Optional URL that tolerates an empty value (common in .env files). */
const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.url().optional(),
);

/** Optional string that tolerates an empty value. */
const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

let rootEnvLoaded = false;

/**
 * Loads the repo-root `.env` (if present) using Node's built-in env file
 * support. Next.js only reads `.env` from the app directory, but the spec
 * keeps a single `.env` at the repo root for web and worker. Never overrides
 * variables that are already set.
 */
function loadRootEnvFile(): void {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) {
      try {
        process.loadEnvFile(candidate);
      } catch {
        // Malformed .env: let the zod schema report missing/invalid values.
      }
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

/**
 * Server environment variables. Parsed once at import time; the app fails to
 * boot with a readable error if anything is missing or malformed.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // core
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .startsWith("postgresql://", "DATABASE_URL must be a postgresql:// URL"),

  // auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: optionalUrl,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  AUTH_REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  // storage
  S3_ENDPOINT: z.url().default("http://localhost:9000"),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("roomdesigner"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_PUBLIC_BASE_URL: optionalUrl,

  // ai
  IMAGE_PROVIDER: z.enum(["fake", "openai"]).default("fake"),
  OPENAI_API_KEY: optionalString,
  OPENAI_IMAGE_MODEL: optionalString,
  MAX_DAILY_SPEND_USD: z.coerce.number().positive().default(5),
  SIGNUP_FREE_CREDITS: z.coerce.number().int().positive().default(3),

  // email
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,

  // billing (V5)
  BILLING_PROVIDER: optionalString,
  BILLING_API_KEY: optionalString,
  BILLING_WEBHOOK_SECRET: optionalString,

  // observability (V6)
  SENTRY_DSN: optionalString,
});

/**
 * Client environment variables (NEXT_PUBLIC_*). Everything the browser needs
 * must be listed here; the server schema must never leak into the client.
 */
export const clientEnvSchema = z.object({});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

function parse<TSchema extends z.ZodType>(
  schema: TSchema,
  source: Record<string, string | undefined>,
  label: string,
): z.output<TSchema> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid ${label} environment variables:\n${issues}`);
  }
  return result.data;
}

let cachedServerEnv: ServerEnv | undefined;
export function getServerEnv(): ServerEnv {
  if (!cachedServerEnv) {
    loadRootEnvFile();
    cachedServerEnv = parse(serverEnvSchema, process.env, "server");
  }
  return cachedServerEnv;
}

let cachedClientEnv: ClientEnv | undefined;
export function getClientEnv(): ClientEnv {
  if (!cachedClientEnv) {
    loadRootEnvFile();
    cachedClientEnv = parse(clientEnvSchema, process.env, "client");
  }
  return cachedClientEnv;
}
