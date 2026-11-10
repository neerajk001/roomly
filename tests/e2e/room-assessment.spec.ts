import { expect, test } from "@playwright/test";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";
import { renderJobStatusSchema } from "../../packages/shared/src/render-status";

test("assessment recovery: wider photo, revised furniture choices and preserved source", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await signInWithOtp(page, { name: "E2E Assessment", email: uniqueEmail("e2e-assessment") });
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Homeowner", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/app");
  await page.goto("/new");
  await page.getByLabel("Room photo", { exact: true }).setInputFiles("tests/e2e/fixtures/room.jpg");
  await page.getByRole("checkbox", { name: "Sofa", exact: true }).check();
  await page
    .getByRole("textbox", { name: "Additional room requests" })
    .fill("Keep space for reading");
  let mode: "photo" | "items" | "pass" = "photo";
  let firstSource: string | undefined;
  await page.route("**/api/renders/*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body: unknown = await response.json();
    const parsed = renderJobStatusSchema.safeParse(body);
    if (!parsed.success || parsed.data.status !== "SUCCEEDED" || mode === "pass") {
      await route.fulfill({ response, json: body });
      return;
    }
    // UI-only fault injection; worker integration tests verify actual stops/refunds.
    if (mode === "photo") firstSource = parsed.data.sourceUrl;
    await route.fulfill({
      response,
      json: {
        ...parsed.data,
        status: "FAILED",
        outputs: [],
        errorCode: mode === "photo" ? "ROOM_PHOTO_INSUFFICIENT" : "ROOM_ITEMS_DONT_FIT",
        errorMessage: "Review the photo or selected items.",
        roomAssessment: {
          source: "ai",
          decision: mode === "photo" ? "needs-photo" : "review-items",
          confidence: mode === "photo" ? "low" : "high",
          boundariesVisible: mode !== "photo",
          floorVisible: mode !== "photo",
          summary: "The requested placement needs review.",
          nextStep:
            mode === "photo"
              ? "Upload a wider photo showing the floor and room corners."
              : "Remove the oversized sofa rather than expanding this room.",
          fixedFeatures: ["Keep the doorway unchanged."],
          accessConstraints: ["Keep the door approach clear."],
          layoutGuidance: ["Choose compact furniture."],
          limitations: ["Exact dimensions cannot be inferred from pixels."],
          items: [
            {
              key: "sofa",
              fit: mode === "photo" ? "uncertain" : "cannot-fit",
              footprint: "The large sofa would crowd the available space.",
              placement: "Keep the doorway clear.",
            },
          ],
        },
      },
    });
  });
  await page.getByRole("button", { name: "Generate 3 ideas", exact: true }).click();
  await page.waitForURL(/\/rooms\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "A clearer room view is needed" })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Review photo & room details", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Room setup", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const presigned = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/uploads/presign") && response.request().method() === "POST",
  );
  await page.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures/room.jpg");
  const uploaded: unknown = await (await presigned).json();
  if (
    typeof uploaded !== "object" ||
    uploaded === null ||
    !("assetId" in uploaded) ||
    typeof uploaded.assetId !== "string"
  )
    throw new Error("Missing replacement upload");
  const replacementId = uploaded.assetId;
  await expect(page.getByAltText("Room photo", { exact: true })).toHaveCount(2);
  await page.getByRole("tab", { name: "Designs", exact: true }).click();
  // Repeating the same hash must still open setup after manually switching tabs.
  await page.getByRole("link", { name: "Review photo & room details", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Room setup", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("tab", { name: "Designs", exact: true }).click();
  mode = "items";
  await page.getByRole("button", { name: /Check photo & generate 3 ideas/ }).click();
  await expect(page.getByRole("heading", { name: "Review what fits in this room" })).toBeVisible({
    timeout: 120_000,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("checkbox", { name: "Sofa", exact: true })).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Updated room request" })).toHaveValue(
    "Keep space for reading",
  );
  await page.getByRole("checkbox", { name: "Sofa", exact: true }).uncheck();
  await page
    .getByRole("textbox", { name: "Updated room request" })
    .fill("Use compact loose chairs instead");
  await page.screenshot({
    path: "test-results/room-assessment-recovery-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  mode = "pass";
  const completed = page.waitForResponse(
    async (response) => {
      if (!/\/api\/renders\/[^/]+$/.test(response.url()) || response.request().method() !== "GET")
        return false;
      const parsed = renderJobStatusSchema.safeParse(await response.json());
      return parsed.success && parsed.data.status === "SUCCEEDED";
    },
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: /Generate with updated choices/ }).click();
  const result = renderJobStatusSchema.parse(await (await completed).json());
  expect(result.includeItems).toEqual([]);
  expect(result.notes).toBe("Use compact loose chairs instead");
  expect(result.sourceUrl).toContain(replacementId);
  expect(result.roomAssessment?.source).toBe("demo");
  await expect(page.getByAltText("Concept 1", { exact: true })).toBeVisible();
  await page.getByText("Demo planning · photo analysis is disabled", { exact: true }).click();
  await expect(
    page.getByText("Demo planning only. The photo has not been analysed.", { exact: true }),
  ).toBeVisible();
  const next = page.waitForResponse(
    async (response) => {
      if (!/\/api\/renders\/[^/]+$/.test(response.url()) || response.request().method() !== "GET")
        return false;
      const parsed = renderJobStatusSchema.safeParse(await response.json());
      return parsed.success && parsed.data.status === "SUCCEEDED";
    },
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: "Generate more · 3 credits", exact: true }).click();
  const more = renderJobStatusSchema.parse(await (await next).json());
  expect(more.notes).toBe("Use compact loose chairs instead");
  expect(more.sourceUrl).toContain(replacementId);
  await page.reload();
  await page.getByText("Design history", { exact: true }).click();
  await page.getByLabel("Previous generation").selectOption({ index: 0 });
  const before = await page.getByAltText("Before", { exact: true }).getAttribute("src");
  if (!before || !firstSource) throw new Error("Missing original source comparison");
  const identity = (value: string) => {
    const url = new URL(value);
    return url.searchParams.get("public_id") ?? url.pathname;
  };
  expect(identity(before)).toBe(identity(firstSource));
});
