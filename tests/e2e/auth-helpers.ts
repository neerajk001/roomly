import type { Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";

export function uniqueEmail(prefix: string): string {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.test`;
  mkdirSync("test-results", { recursive: true });
  appendFileSync("test-results/e2e-users.jsonl", `${JSON.stringify(email)}\n`);
  return email;
}

/**
 * Sign in through the email OTP flow. Playwright runs the app with E2E=1,
 * which makes the auth server issue the fixed code 123456.
 */
export async function signInWithOtp(
  page: Page,
  options: { email: string; name?: string },
): Promise<void> {
  // Each simulated user has its own local proxy IP so auth throttles do not
  // couple independent journeys or require weakening production rate limits.
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  await page.route("**/api/auth/**", (route) =>
    route.continue({
      headers: {
        ...route.request().headers(),
        "x-forwarded-for": `10.${bytes[0]}.${bytes[1]}.${bytes[2]}`,
      },
    }),
  );
  await page.goto("/sign-up");
  if (options.name !== undefined) {
    await page.getByLabel("Name").fill(options.name);
  }
  await page.getByLabel("Email").fill(options.email);
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByLabel("Verification code").waitFor({ state: "visible" });
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Create account" }).click();
}
