import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm --filter @roomdesigner/web exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Test env: no email verification so sign-up lands straight in the app.
      APP_URL: baseURL,
      BETTER_AUTH_URL: baseURL,
      AUTH_REQUIRE_EMAIL_VERIFICATION: "false",
      // Never inherit the local dev auth bypass: the E2E tests exercise real auth.
      DEV_AUTH_BYPASS: "false",
    },
  },
});
