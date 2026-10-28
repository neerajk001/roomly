import { expect, test } from "@playwright/test";

function uniqueEmail(): string {
  return `e2e-share-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.test`;
}

test("wizard renders, favorite, create share link, vote anonymously", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E Share");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/app");

  // Guided wizard
  await page.getByRole("link", { name: "New design" }).click();
  await page.waitForURL("**/app/new");
  await page.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures/room.jpg");
  await page.getByRole("button", { name: "Continue" }).click();

  // Room step: use typical sizes
  await page.getByText("I don't know the exact sizes").click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Keep / renter / budget steps
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Style quiz: skip and choose
  await page.getByRole("button", { name: "Skip, I'll choose myself" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Confirm
  await page.getByRole("button", { name: "Generate" }).click();

  await page.waitForURL(/\/rooms\/[^/]+$/, { timeout: 120_000 });
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 120_000 });

  // Favorite the first concept
  await page.getByRole("button", { name: "Add to favorites" }).first().click();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();

  // Back to the project and create a share link
  await page.getByRole("link", { name: /^Back to/ }).click();
  await page.waitForURL(/\/projects\/[^/]+$/);
  await page.getByRole("button", { name: "Create share link" }).click();
  const shareLink = page.getByText(/\/share\/[A-Za-z0-9_-]+/);
  await expect(shareLink).toBeVisible({ timeout: 30_000 });
  const url = (await shareLink.textContent())?.trim() ?? "";
  expect(url).toContain("/share/");

  // Vote in a fresh browser context (no session)
  const anonymous = await browser.newContext();
  const voter = await anonymous.newPage();
  await voter.goto(url);
  await expect(voter.getByAltText("AI-generated concept").first()).toBeVisible({
    timeout: 30_000,
  });
  // Wait for hydration so the click handler is attached before voting.
  await voter.waitForLoadState("networkidle");
  await voter.waitForTimeout(1200);
  const responsePromise = voter.waitForResponse((response) =>
    response.url().includes("/vote"),
  );
  await voter.getByRole("button", { name: "Vote" }).first().click();
  const voteResponse = await responsePromise;
  expect(voteResponse.status()).toBe(200);
  await expect(voter.getByRole("button", { name: "Voted" }).first()).toBeVisible();
  await expect(voter.getByText("1 vote").first()).toBeVisible();
  await anonymous.close();
});
