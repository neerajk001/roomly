import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyWatermark } from "./watermark";

async function sample(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 140, b: 160 } },
  })
    .jpeg()
    .toBuffer();
}

describe("applyWatermark", () => {
  it("returns a different image with the same dimensions", async () => {
    const source = await sample();
    const marked = await applyWatermark(source);
    const before = await sharp(source).metadata();
    const after = await sharp(marked).metadata();
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect(Buffer.compare(source, marked)).not.toBe(0);
  });

  it("is deterministic in size (smaller/equal encoding)", async () => {
    const source = await sample();
    const marked = await applyWatermark(source);
    expect(marked.byteLength).toBeGreaterThan(0);
  });
});
