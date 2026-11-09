import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "./env";

const validEnv = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/roomdesigner",
  BETTER_AUTH_SECRET: "a-very-long-secret-value-for-tests-1234",
  AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
};

describe("serverEnvSchema", () => {
  it("requires explicit advice model configuration only when enabling the real provider", () => {
    expect(serverEnvSchema.parse(validEnv).ADVICE_PROVIDER).toBe("fake");
    expect(serverEnvSchema.safeParse({ ...validEnv, ADVICE_PROVIDER: "openai" }).success).toBe(
      false,
    );
    expect(
      serverEnvSchema.safeParse({
        ...validEnv,
        ADVICE_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
        OPENAI_ADVICE_MODEL: "chosen-model",
      }).success,
    ).toBe(true);
    expect(serverEnvSchema.safeParse({ ...validEnv, ADVICE_CALL_BUDGET_MICROS: "0" }).success).toBe(
      false,
    );
  });
  it("accepts a valid environment and applies defaults", () => {
    const parsed = serverEnvSchema.parse(validEnv);

    expect(parsed.AUTH_REQUIRE_EMAIL_VERIFICATION).toBe(false);
    expect(parsed.SIGNUP_FREE_CREDITS).toBe(3);
    expect(parsed.IMAGE_PROVIDER).toBe("fake");
    expect(parsed.EMAIL_PROVIDER).toBe("console");
  });

  it("coerces numeric strings", () => {
    const parsed = serverEnvSchema.parse({
      ...validEnv,
      SIGNUP_FREE_CREDITS: "5",
      MAX_DAILY_SPEND_USD: "12.5",
    });
    expect(parsed.SIGNUP_FREE_CREDITS).toBe(5);
    expect(parsed.MAX_DAILY_SPEND_USD).toBe(12.5);
  });

  it("fails when DATABASE_URL is missing", () => {
    const result = serverEnvSchema.safeParse({ ...validEnv, DATABASE_URL: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "DATABASE_URL")).toBe(true);
    }
  });

  it("fails on a malformed DATABASE_URL", () => {
    const result = serverEnvSchema.safeParse({
      ...validEnv,
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
    });
    expect(result.success).toBe(false);
  });

  it("fails on a short auth secret", () => {
    const result = serverEnvSchema.safeParse({ ...validEnv, BETTER_AUTH_SECRET: "short" });
    expect(result.success).toBe(false);
  });

  it("tolerates empty optional values", () => {
    const parsed = serverEnvSchema.parse({
      ...validEnv,
      BETTER_AUTH_URL: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      EMAIL_FROM: "",
    });
    expect(parsed.BETTER_AUTH_URL).toBeUndefined();
    expect(parsed.GOOGLE_CLIENT_ID).toBeUndefined();
  });

  it("rejects an unknown EMAIL_PROVIDER", () => {
    const result = serverEnvSchema.safeParse({ ...validEnv, EMAIL_PROVIDER: "sendgrid" });
    expect(result.success).toBe(false);
  });
});
