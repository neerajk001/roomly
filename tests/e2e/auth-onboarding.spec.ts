import { expect, test } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";

test("home path: sign up, onboarding as Home, land on /app", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signInWithOtp(page, { name: "E2E Home", email: uniqueEmail("e2e") });

  await page.waitForURL("**/onboarding");
  await expect(page.getByRole("heading", { name: "What brings you to RoomDesigner?" })).toBeVisible();

  await page.getByRole("button", { name: /Continue as homeowner/ }).click();

  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { name: /Make yourself at home|Your spaces/ }).first()).toBeVisible();
});

test("pro path: sign up, onboarding as Pro, land on /studio", async ({ page }) => {
  await signInWithOtp(page, { name: "E2E Pro", email: uniqueEmail("e2e") });

  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /Continue as professional/ }).first().click();
  await page.getByLabel("Studio name").fill("E2E Interiors");
  await page.getByRole("button", { name: /Continue as professional/ }).last().click();

  await page.waitForURL("**/studio");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clients" }).first()).toBeVisible();
  await expect(page.getByText("E2E Interiors")).toBeVisible();
});

test("unauthenticated /app redirects to sign-in", async ({ page }) => {
  await page.goto("/app");
  await page.waitForURL("**/sign-in");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});
