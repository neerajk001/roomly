import { expect, test } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";

test("wizard renders, favorite, create share link, vote anonymously", async ({ page, browser }) => {
  test.setTimeout(300_000);
  await signInWithOtp(page, { name: "E2E Share", email: uniqueEmail("e2e-share") });
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /Continue as homeowner/ }).click();
  await page.waitForURL("**/app");

  // Guided wizard
  await page.goto("/new");
  await page.locator('input[type="file"]').first().setInputFiles("tests/e2e/fixtures/room.jpg");
  await page.getByRole("button", { name: "Continue" }).click();

  // Room step: use typical sizes
  await page.getByText("I'm not sure about the exact dimensions").click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Keep / renter / budget steps
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Style step: pick a style
  await page.getByRole("button", { name: /Scandinavian/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Final step: generate
  await page
    .getByRole("button", { name: /Generate 3 concepts/ })
    .first()
    .click();

  await page.waitForURL(/\/rooms\/[^/]+$/, { timeout: 120_000 });
  const roomUrl = page.url();
  const projectId = /\/projects\/([^/]+)\//.exec(roomUrl)?.[1] ?? "";
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 120_000 });

  // Favorite the first concept. The UI updates optimistically, so wait for the
  // PATCH to actually persist: the share link defaults to "favorites only"
  // (`shareShowFavorites` defaults to true), and a lost race leaves the public
  // gallery empty.
  const favoritePersisted = page.waitForResponse(
    (response) =>
      response.url().includes("/api/render-outputs/") && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Add to favorites" }).first().click();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();
  expect((await favoritePersisted).ok()).toBe(true);

  // Back to the project and create a share link
  await page.goto(`/app/projects/${projectId}`);
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
  const responsePromise = voter.waitForResponse((response) => response.url().includes("/vote"));
  await voter.getByRole("button", { name: "Vote" }).first().click();
  const voteResponse = await responsePromise;
  expect(voteResponse.status()).toBe(200);
  await expect(voter.getByRole("button", { name: "Voted" }).first()).toBeVisible();
  await expect(voter.getByText("1 vote").first()).toBeVisible();
  await anonymous.close();
});
