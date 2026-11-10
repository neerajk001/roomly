import { expect, test, type Page } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";
import { renderJobStatusSchema } from "../../packages/shared/src/render-status";

function waitForCompletedRender(page: Page) {
  return page.waitForResponse(
    async (response) => {
      if (!/\/api\/renders\/[^/]+$/.test(response.url()) || response.request().method() !== "GET")
        return false;
      try {
        return renderJobStatusSchema.parse(await response.json()).status === "SUCCEEDED";
      } catch {
        return false;
      }
    },
    { timeout: 120_000 },
  );
}

async function signUpAndOnboardHome(page: Page): Promise<void> {
  await signInWithOtp(page, { name: "E2E Renderer", email: uniqueEmail("e2e-render") });
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Homeowner", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/app");
}

test("full render flow: project, room, photo, 3 concepts, favorite, chat edit", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 375, height: 812 });
  await signUpAndOnboardHome(page);

  // Project (classic form path; /app/new is the guided wizard)
  await page.goto("/app/projects/new");
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
  await page.getByRole("tab", { name: "Designs", exact: true }).click();
  await expect(page.getByLabel("Width (m)", { exact: true })).not.toBeVisible();

  // Generate 3 concepts
  let failedStatusReads = 0;
  await page.route("**/api/renders/*", async (route) => {
    if (route.request().method() === "GET" && failedStatusReads < 5) {
      failedStatusReads++;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary status outage" }),
      });
    } else await route.continue();
  });
  const baseCompleted = waitForCompletedRender(page);
  await page.getByRole("button", { name: "Generate 3 concepts" }).click();
  // Loading copy uses three ASCII dots ("Generating concepts..."); match loosely
  // so a typographic ellipsis in the UI does not break the test. `.first()`
  // because the status chip and the panel both show it.
  await expect(page.getByText(/Generating concepts/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Check status again", exact: true })).toBeVisible({
    timeout: 45_000,
  });
  expect(failedStatusReads).toBe(5);
  await page.getByRole("button", { name: "Check status again", exact: true }).click();
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByAltText("Concept 3")).toBeVisible();
  await expect(
    page.getByText("AI-generated concept visual. Not to scale.", { exact: true }),
  ).toBeVisible();
  const base = renderJobStatusSchema.parse(await (await baseCompleted).json());
  const second = base.outputs[1];
  expect(second).toBeDefined();
  await page.getByRole("link", { name: "Share", exact: true }).click();
  const sharing = page.getByRole("dialog", { name: "Share designs", exact: true });
  await expect(sharing).toBeVisible();
  await expect(
    sharing.getByRole("button", { name: "Create share link", exact: true }),
  ).toBeDisabled();
  await sharing
    .getByRole("checkbox", { name: "Only show favorited images", exact: true })
    .uncheck();
  await expect(
    sharing.getByRole("button", { name: "Create share link", exact: true }),
  ).toBeEnabled();
  await sharing.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("link", { name: "Share", exact: true })).toBeFocused();
  // Explicit concept selection drives comparison and survives a reload.
  const beforeSelection = await page.getByAltText("After", { exact: true }).getAttribute("src");
  await page.getByRole("button", { name: "Select concept 2", exact: true }).click();
  await expect(page.getByAltText("After", { exact: true })).not.toHaveAttribute(
    "src",
    beforeSelection ?? "",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Select concept 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "View full design", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Concept preview", exact: true });
  await expect(preview).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).not.toBeVisible();
  await expect(page.getByRole("button", { name: "View full design", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/room-designs-desktop.png", fullPage: true });
  await page.getByText("Ideas & versions", { exact: true }).click();
  await page.getByRole("button", { name: "Explore suggestions →", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit this concept", exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Get suggestions", exact: true }).click();
  await expect(page.getByText(/Demo suggestions · based on preferences/)).toBeVisible();
  await page.getByRole("button", { name: "Use this idea", exact: true }).first().click();
  const composer = page.getByRole("textbox", { name: "Describe a change to this concept" });
  await expect(composer).toHaveValue(/portable lamp/);
  await composer.fill("make the sofa deep green");
  await page.getByRole("button", { name: "Back to designs", exact: true }).click();
  await page.getByRole("button", { name: "Select concept 1", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).first().click();
  await expect(composer).toHaveValue("");
  await composer.fill("add a small accent");
  await page.getByRole("button", { name: "Back to designs", exact: true }).click();
  await page.getByRole("button", { name: "Select concept 2", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).click();
  await expect(composer).toHaveValue("make the sofa deep green");
  await expect(page.getByText(/^Editing concept 2/)).toBeVisible();
  await expect(composer).toBeFocused();
  await expect(page.getByRole("button", { name: "Find objects", exact: true })).toHaveCount(0);
  await page.getByText("Change a specific area (optional)", { exact: true }).click();
  await expect(
    page.getByText("Demo mode: object detection is disabled. Mark an area manually."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark an area", exact: true }).click();
  await expect(page.getByAltText("Concept area selection")).toBeVisible();
  const selection = page.getByRole("group", { name: "Draw editable area", exact: true });
  await selection.scrollIntoViewIfNeeded();
  const box = await selection.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error("Selection image is missing.");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75, { steps: 5 });
  await page.mouse.up();
  await page.getByText("Adjust selection edges", { exact: true }).click();
  const leftEdge = page.getByRole("slider", { name: "left edge", exact: true });
  await leftEdge.focus();
  await leftEdge.press("ArrowRight");
  await expect(leftEdge).toHaveValue("260");
  await page.getByRole("button", { name: "Back to designs", exact: true }).click();
  await page.getByRole("button", { name: "Select concept 1", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).first().click();
  await page.getByText("Change a specific area (optional)", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Use whole image", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Back to designs", exact: true }).click();
  await page.getByRole("button", { name: "Select concept 2", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).click();
  await page.getByText("Adjust selection edges", { exact: true }).click();
  await expect(leftEdge).toHaveValue("260");
  await expect(page.getByRole("button", { name: "Apply change", exact: true })).toBeInViewport();
  await expect(page.getByAltText("Concept area selection")).toBeInViewport();
  const imageBox = await page.getByAltText("Concept area selection").boundingBox();
  const canvasBox = await selection.boundingBox();
  expect(imageBox?.width).toBeCloseTo(canvasBox?.width ?? 0, 0);
  expect(imageBox?.height).toBeCloseTo(canvasBox?.height ?? 0, 0);
  await page.screenshot({ path: "test-results/room-editor-desktop.png" });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("button", { name: "Apply change", exact: true })).toBeInViewport();
  await expect(page.getByAltText("Concept area selection")).toBeInViewport();
  expect(await editor.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/room-editor-mobile.png" });
  await composer.press("Escape");
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit this design", exact: true }).first(),
  ).toBeFocused();
  // Costs and setup have dedicated space; switching sections retains the chosen concept.
  await page.getByRole("tab", { name: "Costs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cost range", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose your favourite design", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("tab", { name: "Room setup", exact: true }).click();
  await expect(page.getByLabel("Width (m)", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Designs", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select concept 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Favorite the first concept
  const favorite = page.getByRole("button", { name: "Add to favorites" }).first();
  await favorite.click();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Select concept 2", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).click();
  await expect(composer).toHaveValue("make the sofa deep green");

  // Refine the selected second concept and verify the actual server-side lineage.
  const editCompleted = waitForCompletedRender(page);
  await page.getByRole("button", { name: "Apply change" }).click();
  const edited = renderJobStatusSchema.parse(await (await editCompleted).json());
  await expect(page.getByAltText("Concept 1", { exact: true })).toBeVisible();
  await expect(page.getByAltText(/^Concept \d+$/)).toHaveCount(1);
  expect(edited.sourceOutputId).toBe(second?.id);
  expect(edited.editTarget).toEqual({
    label: "Selected area",
    region: { left: 260, top: 250, right: 750, bottom: 750 },
  });
  await page.getByText("Ideas & versions", { exact: true }).click();
  const family = page
    .locator("details")
    .filter({ has: page.getByText(/^Changes for this concept/) })
    .last();
  await family.locator("summary").click();
  await expect(family.getByRole("button", { name: /^Original concept 2/ })).toBeVisible();
  await expect(family.getByRole("button", { name: /^Original concept 1/ })).toHaveCount(0);
  await page.getByText("Design history", { exact: true }).click();
  const history = page.getByLabel("Previous generation");
  const editedId = await history.inputValue();
  const originalId = await history.locator("option").first().getAttribute("value");
  await history.selectOption(originalId ?? "");
  await expect(page.getByAltText("Concept 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();
  await history.selectOption(editedId);
  await expect(page.getByAltText(/^Concept \d+$/)).toHaveCount(1);
  await page.getByAltText("Concept 1").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .getByAltText("Concept 1")
        .evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/home-room-mobile.png", fullPage: true });
});
