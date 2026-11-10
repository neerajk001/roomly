import { expect, test } from "@playwright/test";
import { verifyRoomComparison } from "./comparison-helpers";
import { signInWithOtp, uniqueEmail } from "./auth-helpers";

test("designer brief, concept, estimate, proposal and anonymous approval", async ({
  page,
  browser,
  context,
}) => {
  test.setTimeout(420_000);
  await signInWithOtp(page, { name: "E2E Designer", email: uniqueEmail("e2e-studio") });
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "Professional", exact: true }).click();
  await page.getByLabel("Studio name").fill("E2E Design Studio");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForURL("**/studio");
  await page.goto("/studio/clients");
  await page.getByLabel("Name", { exact: true }).fill("E2E Client");
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await page.waitForURL(/\/studio\/clients\/[^/]+$/);
  const clientUrl = page.url();
  await page.getByRole("button", { name: "Create brief link" }).click();
  const briefLink = page.getByText(/http.*\/brief\/[A-Za-z0-9_-]+/);
  await expect(briefLink).toBeVisible();
  const briefUrl = (await briefLink.textContent())?.trim() ?? "";
  const anonymous = await browser.newContext({ viewport: { width: 375, height: 812 } });
  try {
    const client = await anonymous.newPage();
    await client.goto(briefUrl);
    await client.getByLabel("Your name").fill("E2E Client");
    await client
      .getByLabel("What do you want to change?")
      .fill("A calm living room with warm lighting");
    await client.getByText("Preferences & constraints (optional)", { exact: true }).click();
    await client.getByRole("button", { name: "Modern", exact: true }).click();
    await client.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures/room.jpg");
    await expect(client.getByText("Uploaded", { exact: true })).toBeVisible({ timeout: 45_000 });
    await client.getByRole("button", { name: "Send brief" }).click();
    await expect(client.getByRole("heading", { name: "Thank you!" })).toBeVisible();
    await page.goto(clientUrl);
    await page.getByRole("link", { name: /Living room brief/ }).click();
    await page.waitForURL(/\/studio\/projects\/[^/]+$/);
    const projectUrl = page.url();
    await page.getByRole("link", { name: "Open room", exact: true }).click();
    await page.waitForURL(/\/rooms\/[^/]+$/);
    const roomUrl = page.url();
    await page.getByRole("tab", { name: "Room setup", exact: true }).click();
    await expect(page.getByAltText("Room photo")).toBeVisible();
    await page.getByLabel("Width (m)", { exact: true }).fill("4");
    await page.getByLabel("Length (m)", { exact: true }).fill("5");
    await page.getByLabel("Ceiling height (m)", { exact: true }).fill("2.7");
    await page.getByRole("button", { name: "Save room details" }).click();
    await expect(page.getByText("Room details saved.", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Designs", exact: true }).click();
    await page.getByRole("button", { name: "Generate 3 concepts" }).click();
    await expect(page.getByAltText("Concept 3")).toBeVisible({ timeout: 120_000 });
    await expect(
      page.getByText("Demo planning · photo analysis is disabled", { exact: true }),
    ).toBeVisible();
    await verifyRoomComparison(page, "pro");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "Edit this", exact: true }).first().click();
    await page.getByText("Change a specific area (optional)", { exact: true }).click();
    await page.getByRole("button", { name: "Mark an area", exact: true }).click();
    await page.getByText("Adjust selection edges", { exact: true }).click();
    await expect(page.getByRole("slider", { name: "left edge", exact: true })).toHaveValue("250");
    for (let i = 0; i < 4; i++)
      await page.getByRole("button", { name: "Add area", exact: true }).click();
    await expect(page.getByRole("button", { name: "Area 5", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Add area", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Analyse selected areas", exact: true }).click();
    await expect(page.getByText(/Demo ideas for 5 selected areas/)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole("button", { name: "Apply change", exact: true })).toBeInViewport();
    await page.screenshot({ path: "test-results/pro-area-selection-mobile.png" });
    await page.getByRole("button", { name: "Clear all areas", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Analyse selected areas", exact: true }),
    ).toBeDisabled();
    await page.getByText("Change a specific area (optional)", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Use whole image", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Back to designs", exact: true }).click();
    await page.getByRole("tab", { name: "Costs", exact: true }).click();
    await page.getByRole("link", { name: "Build estimate", exact: true }).click();
    await page.getByRole("button", { name: "Save as new version" }).click();
    await expect(page.getByText("Saved estimate v1", { exact: true })).toBeVisible();
    await page.goto(projectUrl);
    await page.getByRole("tab", { name: "Rooms & designs", exact: true }).click();
    await expect(page.getByAltText(/Concept visual for/).first()).toBeVisible();
    await page.getByRole("tab", { name: "Proposals", exact: true }).click();
    await page.getByRole("link", { name: "New proposal", exact: true }).click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Create draft proposal" }).click();
    await page.waitForURL(/\/studio\/projects\/[^/]+$/);
    await page.getByRole("tab", { name: "Proposals", exact: true }).click();
    const preview = page.getByRole("link", { name: "Preview PDF" });
    const pdf = await context.request.get((await preview.getAttribute("href")) ?? "");
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
    await page.getByRole("button", { name: "Send to client", exact: true }).click();
    await expect(page.getByText("SENT", { exact: true })).toBeVisible({ timeout: 90_000 });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy client link" }).click();
    const proposalUrl = await page.evaluate(() => navigator.clipboard.readText());
    await client.goto(proposalUrl);
    expect(
      await client.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await client.screenshot({ path: "test-results/proposal-mobile.png", fullPage: true });
    await client.getByLabel("Your name").fill("E2E Client");
    await client.getByRole("radio").first().check();
    client.once("dialog", (dialog) => void dialog.accept());
    await client.getByRole("button", { name: /Approve/ }).click();
    await expect(client.getByText(/Approved by E2E Client/)).toBeVisible();
    await page.goto(projectUrl);
    await page.getByRole("tab", { name: "Proposals", exact: true }).click();
    await expect(page.getByText("APPROVED", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Activity", exact: true }).click();
    await expect(page.getByText(/Design proposal · approved/)).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: "test-results/studio-mobile.png", fullPage: true });
  } finally {
    await anonymous.close();
  }
});
