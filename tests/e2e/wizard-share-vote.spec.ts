import { expect, test } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";
import { STYLES } from "../../packages/shared/src/styles";

test("wizard renders, favorite, create share link, vote anonymously", async ({ page, browser }) => {
  test.setTimeout(300_000);
  for (const style of STYLES) {
    const preview = await page.request.get(style.thumbnail);
    expect(preview.status(), style.key).toBe(200);
    expect(preview.headers()["content-type"]).toContain("image/webp");
  }
  await signInWithOtp(page, { name: "E2E Share", email: uniqueEmail("e2e-share") });
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: /Continue as homeowner/ }).click();
  await page.getByRole("button", { name: "Open my home workspace" }).click();
  await page.waitForURL("**/app");

  // Guided wizard
  await page.goto("/new");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('input[type="file"]').first().setInputFiles("tests/e2e/fixtures/room.jpg");
  await page.getByRole("button", { name: "Continue" }).click();

  // Room step: use typical sizes
  await page.getByLabel("Room type", { exact: true }).selectOption("KITCHEN");
  await page.getByText("I'm not sure about the exact dimensions").click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Keep / renter steps
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // Tradition first, then room-specific looks. Every selected look gets a concept.
  await expect(page.getByRole("heading", { name: "Find your design direction" })).toBeVisible();
  await page.getByRole("button", { name: /^India / }).click();
  await page.getByRole("button", { name: "Choose contrasting looks for me" }).click();
  await expect(page.getByRole("button", { name: /^Indian/, pressed: true })).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Indian heritage/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /^Indian minimal/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const label of [
    "Indian contemporary",
    "Indian heritage",
    "Indian minimal",
    "Indian craft",
  ]) {
    const look = page.getByRole("button", { name: new RegExp(`^${label}`) });
    if ((await look.getAttribute("aria-pressed")) === "true") await look.click();
  }
  await page.getByRole("button", { name: /^Indian contemporary/ }).click();
  await page.getByRole("button", { name: /^Indian minimal/ }).click();
  await page.getByRole("button", { name: /^Indian craft/ }).click();
  await expect(page.getByRole("img", { name: "Indian craft kitchen reference" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Indian craft kitchen reference" })).toHaveCSS(
    "left",
    /-/,
  );
  await page.screenshot({ path: "test-results/guided-style-mobile.png", fullPage: true });
  const overflow = await page.evaluate(() => ({
    width: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 12)
      .map((el) => ({ tag: el.tagName, className: el.className })),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
  await page.getByRole("button", { name: "Continue" }).click();
  // Budget is optional, and a selected tier can be cleared.
  await page.getByRole("button", { name: /^Premium/ }).click();
  await page.getByRole("button", { name: "No budget preference" }).click();
  await expect(page.getByRole("button", { name: /^Premium/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: /^Budget-friendly/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Variations", { exact: true }).selectOption("2");
  await expect(page.getByRole("button", { name: /Generate 2 concepts/ }).first()).toBeDisabled();
  await page.getByLabel("Variations", { exact: true }).selectOption("3");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/guided-review-desktop.png", fullPage: true });
  // Final step: generate
  // Exercise the similar-results feedback independently of the fake provider's tint choices.
  await page.route("**/api/renders/*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      body.status === "SUCCEEDED"
    ) {
      await route.fulfill({ response, json: { ...body, similarConcepts: true } });
    } else await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: /Generate 3 concepts/ })
    .first()
    .click();

  await page.waitForURL(/\/rooms\/[^/]+$/, { timeout: 120_000 });
  const roomUrl = page.url();
  const projectId = /\/projects\/([^/]+)\//.exec(roomUrl)?.[1] ?? "";
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText("01 · Indian contemporary", { exact: true })).toBeVisible();
  await expect(page.getByText("02 · Indian minimal", { exact: true })).toBeVisible();
  await expect(page.getByText("03 · Indian craft", { exact: true })).toBeVisible();
  for (const direction of ["Light & open", "Warm & tactile", "Bold & expressive"])
    await expect(page.getByText(direction, { exact: true })).toBeVisible();
  await expect(page.getByText(/Some concepts are visually similar/)).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  for (let index = 1; index <= 3; index++) {
    const image = page.getByAltText(`Concept ${index}`, { exact: true });
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/batch-2-results-mobile.png", fullPage: true });

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
