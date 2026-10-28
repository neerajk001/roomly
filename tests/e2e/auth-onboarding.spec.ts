import { expect, test } from "@playwright/test";

function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.test`;
}

async function signUp(page: import("@playwright/test").Page, name: string, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
}

test("home path: sign up, onboarding as Home, land on /app", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signUp(page, "E2E Home", uniqueEmail());

  await page.waitForURL("**/onboarding");
  await expect(page.getByText("Set up your workspace")).toBeVisible();

  await page.getByRole("button", { name: /I'm designing my home/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { name: "My rooms" })).toBeVisible();
  await expect(page.getByText("No projects yet")).toBeVisible();
});

test("pro path: sign up, onboarding as Pro, land on /studio", async ({ page }) => {
  await signUp(page, "E2E Pro", uniqueEmail());

  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /I'm a design professional/ }).click();
  await page.getByLabel("Studio name").fill("E2E Interiors");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL("**/studio");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clients" })).toBeVisible();
  await expect(page.getByText("E2E Interiors")).toBeVisible();
});

test("unauthenticated /app redirects to sign-in", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL("**/sign-in");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});
