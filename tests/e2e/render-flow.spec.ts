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
  await page.getByRole("button", { name: /Continue as homeowner/ }).click();
  await page.getByRole("button", { name: "Open my home workspace" }).click();
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

  // Generate 3 concepts
  const baseCompleted = waitForCompletedRender(page);
  await page.getByRole("button", { name: "Generate 3 concepts" }).click();
  // Loading copy uses three ASCII dots ("Generating concepts..."); match loosely
  // so a typographic ellipsis in the UI does not break the test. `.first()`
  // because the status chip and the panel both show it.
  await expect(page.getByText(/Generating concepts/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByAltText("Concept 1")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByAltText("Concept 3")).toBeVisible();
  await expect(
    page.getByText("AI-generated concept visual. Not to scale.", { exact: true }),
  ).toBeVisible();
  const base = renderJobStatusSchema.parse(await (await baseCompleted).json());
  const second = base.outputs[1];
  expect(second).toBeDefined();
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
  await page.getByRole("button", { name: "Get suggestions", exact: true }).click();
  await expect(page.getByText(/Demo suggestions · based on preferences/)).toBeVisible();
  await page.getByRole("button", { name: "Use this idea", exact: true }).first().click();
  const composer = page.getByRole("textbox", { name: "Describe a change to this concept" });
  await expect(composer).toHaveValue(/portable lamp/);
  await composer.fill("make the sofa deep green");
  await page.getByRole("button", { name: "Select concept 1", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).first().click();
  await expect(composer).toHaveValue("");
  await composer.fill("add a small accent");
  await page.getByRole("button", { name: "Edit this design", exact: true }).nth(1).click();
  await expect(composer).toHaveValue("make the sofa deep green");
  await expect(page.getByText(/^Editing concept 2/)).toBeVisible();
  await expect(composer).toBeFocused();
  await page.getByText("Choose an object or area (optional)", { exact: true }).click();
  await page.getByRole("button", { name: "Find objects", exact: true }).click();
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
  const leftEdge = page.getByRole("slider", { name: "left edge", exact: true });
  await leftEdge.focus();
  await leftEdge.press("ArrowRight");
  await expect(leftEdge).toHaveValue("260");
  await page.getByRole("button", { name: "Select concept 1", exact: true }).click();
  await page.getByRole("button", { name: "Edit this design", exact: true }).first().click();
  await page.getByText("Choose an object or area (optional)", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Use whole image", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Edit this design", exact: true }).nth(1).click();
  await expect(leftEdge).toHaveValue("260");
  await page.screenshot({ path: "test-results/concept-2-refinement-mobile.png", fullPage: true });

  // Favorite the first concept
  const favorite = page.getByRole("button", { name: "Add to favorites" }).first();
  await favorite.click();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();

  // Refine the selected second concept and verify the actual server-side lineage.
  const editCompleted = waitForCompletedRender(page);
  await page.getByRole("button", { name: "Apply change" }).click();
  await expect(page.getByText("1 concepts ready", { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByAltText("Concept 1")).toBeVisible();
  const edited = renderJobStatusSchema.parse(await (await editCompleted).json());
  expect(edited.sourceOutputId).toBe(second?.id);
  expect(edited.editTarget).toEqual({
    label: "Selected area",
    region: { left: 260, top: 250, right: 750, bottom: 750 },
  });
  const family = page
    .locator("details")
    .filter({ has: page.getByText(/^Changes for this concept/) });
  await family.locator("summary").click();
  await expect(family.getByRole("button", { name: /^Original concept 2/ })).toBeVisible();
  await expect(family.getByRole("button", { name: /^Original concept 1/ })).toHaveCount(0);
  const history = page.getByLabel("Design history");
  const editedId = await history.inputValue();
  const originalId = await history.locator("option").first().getAttribute("value");
  await history.selectOption(originalId ?? "");
  await expect(page.getByAltText("Concept 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove from favorites" }).first()).toBeVisible();
  await history.selectOption(editedId);
  await expect(page.getByText("1 concepts ready", { exact: true })).toBeVisible();
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
