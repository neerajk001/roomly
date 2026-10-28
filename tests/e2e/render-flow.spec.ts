import { expect, test, type Page } from "@playwright/test";

function uniqueEmail(): string {
  return `e2e-render-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.test`;
}

async function signUpAndOnboardHome(page: Page): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Renderer");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/app");
}

test("full render flow: project, room, photo, 4 concepts, favorite, chat edit", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await signUpAndOnboardHome(page);

  // Project
  await page.getByRole("link", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("E2E project");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/app\/projects\/[^/]+$/);

  // Room
  await page.getByLabel("Room name").fill("Living room");
  await page.getByRole("button", { name: "Add room" }).click();
  await expect(page.getByRole("link", { name: "Open room" })).toBeVisible();

  // Open the room and upload a photo
  await page.getByRole("link", { name: "Open room" }).click();
  await page.waitForURL(/\/rooms\/[^/]+$/);
  await page.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures/room.jpg");
  await expect(page.getByAltText("Room photo")).toBeVisible({ timeout: 30_000 });

  // Generate 4 concepts
  await page.getByRole("button", { name: "Generate 4 concepts" }).click();
  await expect(page.getByText("Generating concepts…")).toBeVisible();
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByAltText("Concept 4")).toBeVisible();
  await expect(page.getByText("AI-generated concept visual. Not to scale.", { exact: true })).toBeVisible();

  // Favorite the first concept
  const favorite = page.getByRole("button", { name: "Add to favorites" }).first();
  await favorite.click();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();

  // Chat edit from the first concept
  await page.getByRole("button", { name: "Edit this" }).first().click();
  await page
    .getByPlaceholder("E.g. make the sofa a deep green, keep everything else the same")
    .fill("make the sofa deep green");
  await page.getByRole("button", { name: "Apply change" }).click();
  await expect(page.getByRole("button", { name: /Edit: make the sofa deep green/ })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 90_000 });
});
