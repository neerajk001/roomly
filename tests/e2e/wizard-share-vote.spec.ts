import { expect, test } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";
import { STYLES } from "../../packages/shared/src/styles";
import { ROOM_CHECKLISTS } from "../../packages/shared/src/room-checklists";
import { recommendContrastingStyles } from "../../packages/shared/src/concept-directions";
import { renderJobStatusSchema } from "../../packages/shared/src/render-status";

test("wizard renders, favorite, create share link, vote anonymously", async ({ page, browser }) => {
  test.setTimeout(300_000);
  for (const style of STYLES) {
    const preview = await page.request.get(style.thumbnail);
    expect(preview.status(), style.key).toBe(200);
    expect(preview.headers()["content-type"]).toContain("image/webp");
  }
  await signInWithOtp(page, { name: "E2E Share", email: uniqueEmail("e2e-share") });
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Homeowner", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/app");

  // One Home screen; every room has its own optional must-have list.
  await page.goto("/new");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("heading", { name: "Your room. Three new ideas." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Additional room requests" })
    .fill("Leave a small corner for a coffee station");
  await page.getByLabel("Room photo", { exact: true }).setInputFiles("tests/e2e/fixtures/room.jpg");
  await expect(page.getByRole("button", { name: "Generate 3 ideas", exact: true })).toBeEnabled();
  for (const room of ROOM_CHECKLISTS) {
    await page.getByLabel("Room type", { exact: true }).selectOption(room.key);
    await expect(page.getByRole("checkbox")).toHaveCount(room.items.length);
    await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
    for (const [, label] of room.items)
      await expect(page.getByRole("checkbox", { name: label, exact: true })).toBeVisible();
    await page.getByRole("checkbox").first().check();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByLabel("Room type", { exact: true }).selectOption("KITCHEN");
  await expect(page.getByRole("checkbox", { name: "Sofa", exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Countertop organizers", exact: true }).check();
  await page.getByRole("checkbox", { name: "Breakfast stools", exact: true }).check();
  await page.getByText("Choose a style (optional)", { exact: true }).click();
  await page.getByLabel("Design style", { exact: true }).selectOption("indian-contemporary");
  await page.getByLabel("Design style", { exact: true }).selectOption("");
  await page.getByText("Choose a style (optional)", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/home-quick-start-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/home-quick-start-desktop.png", fullPage: true });
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
  const completed = page.waitForResponse(
    async (response) => {
      if (!/\/api\/renders\/[^/]+$/.test(response.url()) || response.request().method() !== "GET")
        return false;
      try {
        return renderJobStatusSchema.parse(await response.json()).status === "SUCCEEDED";
      } catch {
        return false;
      }
    },
    { timeout: 120000 },
  );
  await page.getByRole("button", { name: "Generate 3 ideas", exact: true }).click();
  await page.waitForURL(/\/rooms\/[^/]+$/, { timeout: 120_000 });
  const roomUrl = page.url();
  const projectId = /\/projects\/([^/]+)\//.exec(roomUrl)?.[1] ?? "";
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 120_000 });
  const generated = renderJobStatusSchema.parse(await (await completed).json());
  await page.getByRole("tab", { name: "Room setup", exact: true }).click();
  await page.getByText("Room details & selected items", { exact: true }).click();
  await expect(
    page.getByText("Leave a small corner for a coffee station", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Designs", exact: true }).click();
  expect(generated.includeItems).toEqual(["counter-organizers", "breakfast-stools"]);
  expect(generated.outputs.map((output) => output.styleKey)).toEqual(
    recommendContrastingStyles("global", 3),
  );
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

  const secondFavorite = page.waitForResponse(
    (response) =>
      response.url().includes("/api/render-outputs/") && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Add to favorites", exact: true }).first().click();
  expect((await secondFavorite).ok()).toBe(true);
  await page.goto("/app/saved");
  await expect(page.getByRole("heading", { name: "Saved designs", exact: true })).toBeVisible();
  const secondStyle = STYLES.find((style) => style.key === generated.outputs[1]?.styleKey)?.label;
  if (!secondStyle) throw new Error("Missing second concept style");
  await expect(page.getByRole("list").getByText(secondStyle, { exact: true })).toBeVisible();
  // The room library opens a single-room project directly.
  // Back to the project and create a share link
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "My rooms", exact: true })).toBeVisible();
  const roomLink = page.locator(
    'a[href="/app/projects/' +
      projectId +
      "/rooms/" +
      /\/rooms\/([^/]+)$/.exec(roomUrl)?.[1] +
      '"]',
  );
  await roomLink.click();
  await expect(page).toHaveURL(roomUrl);
  await page.getByRole("link", { name: "Share", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Share designs", exact: true })).toBeVisible();
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
