import { expect, type Page, type Route } from "@playwright/test";

/** Exercise real Home/Pro viewers with deterministic image sizes; no provider calls. */
export async function verifyRoomComparison(page: Page, prefix: string) {
  const viewport = page.viewportSize();
  await page.getByText("Compare before & after", { exact: true }).click();
  const inline = page.getByRole("region", { name: "Room comparison", exact: true });
  const before = await inline.getByAltText("Before", { exact: true }).getAttribute("src");
  const after = await inline.getByAltText("After", { exact: true }).getAttribute("src");
  if (!before || !after) throw new Error("Missing comparison image URLs");
  function identity(value: string) {
    const url = new URL(value);
    return url.origin + url.pathname + ":" + (url.searchParams.get("public_id") ?? "");
  }
  const beforeId = identity(before);
  const afterId = identity(after);
  const pattern = "**/*";
  let shape: "landscape" | "portrait" | "mismatch" | "error" = "landscape";
  const handler = async (route: Route) => {
    const id = identity(route.request().url());
    if (id !== beforeId && id !== afterId) {
      await route.continue();
      return;
    }
    const isAfter = id === afterId;
    if (shape === "error" && isAfter) {
      await route.fulfill({
        status: 503,
        headers: { "cache-control": "no-store" },
        body: "Image unavailable",
      });
      return;
    }
    const portrait =
      shape === "portrait" || ((shape === "mismatch" || shape === "error") && !isAfter);
    const [width, height] = portrait ? [900, 1400] : [1600, 1000];
    await route.fulfill({
      contentType: "image/svg+xml",
      headers: { "cache-control": "no-store" },
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${isAfter ? "#d8dbd9" : "#e8e9e8"}"/><rect x="3" y="3" width="${width - 6}" height="${height - 6}" fill="none" stroke="#182224" stroke-width="6"/><circle cx="${width / 2}" cy="${height / 2}" r="100" fill="#b65308"/></svg>`,
    });
  };
  await page.route(pattern, handler);
  const dialog = page.getByRole("dialog", { name: "Compare before & after", exact: true });
  const expand = inline.getByRole("button", { name: "Expand comparison", exact: true });
  const close = () => dialog.getByRole("button", { name: "Close comparison", exact: true }).click();
  async function loadCase() {
    // A fresh document avoids Chromium's already-decoded image memory cache.
    await page.reload();
    await page.getByText("Compare before & after", { exact: true }).click();
    await expand.click();
  }
  async function ready(label: string, width: number, height: number) {
    await expect
      .poll(() =>
        dialog.getByAltText(label, { exact: true }).evaluate((element) => {
          const image = element as HTMLImageElement;
          return [image.naturalWidth, image.naturalHeight];
        }),
      )
      .toEqual([width, height]);
    await expect(dialog.getByAltText(label, { exact: true })).toHaveCSS("object-fit", "contain");
  }
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loadCase();
    await ready("Before", 1600, 1000);
    await ready("After", 1600, 1000);
    await expect(dialog.getByRole("button", { name: "Side by side", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(dialog.getByAltText("Before", { exact: true })).toBeInViewport();
    await expect(dialog.getByAltText("After", { exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/${prefix}-comparison-desktop.png` });
    await dialog.getByRole("button", { name: "Slider", exact: true }).click();
    const slider = dialog.getByRole("slider", { name: "Before and after slider", exact: true });
    const beforeBox = await dialog.getByAltText("After", { exact: true }).boundingBox();
    await slider.focus();
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    await expect(dialog.locator("[data-comparison-overlay]")).toHaveCSS(
      "clip-path",
      "inset(0px 100% 0px 0px)",
    );
    await slider.press("End");
    await expect(slider).toHaveValue("100");
    const afterBox = await dialog.getByAltText("After", { exact: true }).boundingBox();
    expect(afterBox?.width).toBeCloseTo(beforeBox?.width ?? 0, 1);
    expect(afterBox?.height).toBeCloseTo(beforeBox?.height ?? 0, 1);
    await page.screenshot({ path: `test-results/${prefix}-comparison-slider.png` });
    await dialog.getByRole("button", { name: "Side by side", exact: true }).click();
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(dialog.getByAltText("Before", { exact: true })).toBeVisible();
    await expect(dialog.getByAltText("After", { exact: true })).not.toBeVisible();
    await dialog.getByRole("button", { name: "After", exact: true }).click();
    await expect(dialog.getByAltText("After", { exact: true })).toBeInViewport();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/${prefix}-comparison-mobile.png` });
    shape = "portrait";
    await loadCase();
    await ready("Before", 900, 1400);
    await ready("After", 900, 1400);
    await expect(dialog.getByRole("button", { name: "Slider", exact: true })).toBeEnabled();
    await page.screenshot({ path: `test-results/${prefix}-comparison-portrait.png` });
    shape = "mismatch";
    await loadCase();
    await ready("Before", 900, 1400);
    await ready("After", 1600, 1000);
    await expect(dialog.getByRole("button", { name: "Slider", exact: true })).toBeDisabled();
    await expect(dialog.getByText(/different proportions/)).toBeVisible();
    shape = "error";
    await loadCase();
    await dialog.getByRole("button", { name: "After", exact: true }).click();
    await expect(
      dialog.getByText("After image could not be loaded.", { exact: true }),
    ).toBeVisible();
    shape = "landscape";
    await dialog.getByRole("button", { name: "Retry after image", exact: true }).click();
    await ready("After", 1600, 1000);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(expand).toBeFocused();
  } finally {
    await page.unroute(pattern, handler);
    if (await dialog.isVisible()) await close();
    await page.reload();
    if (viewport) await page.setViewportSize(viewport);
  }
}
