import { expect, test } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";

test("home path: sign up, onboarding as Home, land on /app", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInWithOtp(page, { name: "E2E Home", email: uniqueEmail("e2e") });

  await page.waitForURL("**/onboarding");
  await expect(
    page.getByRole("heading", { name: "What brings you to RoomDesigner?" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Homeowner", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { name: "My rooms", exact: true }).first()).toBeVisible();
  await page.getByLabel("Account menu", { exact: true }).click();
  await page.getByRole("link", { name: "Switch to designer", exact: true }).click();
  await page.waitForURL("**/studio");
  const studioNav = page
    .getByRole("navigation", { name: "Studio", exact: true })
    .filter({ visible: true });
  await studioNav.getByRole("link", { name: "Clients" }).click();
  await expect(studioNav.getByRole("link", { name: "Clients" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(studioNav.getByRole("link", { name: "Projects" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByLabel("Account menu", { exact: true }).click();
  await page.getByRole("link", { name: "Account settings", exact: true }).click();
  await page.getByRole("link", { name: "Homeowner workspace" }).click();
  await page.waitForURL("**/app");
});

test("pro path: sign up, onboarding as Pro, land on /studio", async ({ page }) => {
  test.setTimeout(240000);
  await signInWithOtp(page, { name: "E2E Pro", email: uniqueEmail("e2e") });

  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Professional", exact: true }).first().click();
  await page.getByLabel("Studio name").fill("E2E Interiors");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.waitForURL("**/studio");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clients" }).first()).toBeVisible();
  await expect(page.getByText("E2E Interiors")).toBeVisible();
  await page.goto("/studio/projects/new");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    page.getByRole("heading", { name: "Start a client project", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Project name", exact: true })
    .fill("Quick studio project");
  await page.getByLabel("Room photo", { exact: true }).setInputFiles("tests/e2e/fixtures/room.jpg");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/pro-quick-start-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Generate 3 ideas", exact: true }).click();
  await page.waitForURL(/\/studio\/projects\/[^/]+\/rooms\/[^/]+$/, { timeout: 120000 });
  await expect(page.getByAltText("Concept 1", { exact: true })).toBeVisible({ timeout: 120000 });
  await expect(
    page.getByRole("link", { name: "Back to Quick studio project", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Account menu", { exact: true }).click();
  await page.getByRole("link", { name: "Switch to homeowner", exact: true }).click();
  await page.getByRole("link", { name: "New design", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your room. Three new ideas.", exact: true }),
  ).toBeVisible();
});

test("unauthenticated /app redirects to sign-in", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL("**/sign-in");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});
