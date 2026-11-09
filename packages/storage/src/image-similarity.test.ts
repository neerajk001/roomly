import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { compareFingerprints, duplicatePairs, fingerprintImage } from "./image-similarity";

async function fixture(alternative = false) {
  const pixels = Buffer.alloc(160 * 120 * 3);
  for (let y = 0; y < 120; y++)
    for (let x = 0; x < 160; x++) {
      const furniture = alternative
        ? x > 70 && y > 35 && y < 85
        : x > 20 && x < 90 && y > 60 && y < 100;
      const colour = furniture
        ? alternative
          ? [45, 95, 145]
          : [140, 65, 35]
        : y > 100
          ? [100, 85, 65]
          : [225, 220, 210];
      pixels.set(colour, (y * 160 + x) * 3);
    }
  return sharp(pixels, { raw: { width: 160, height: 120, channels: 3 } })
    .png()
    .toBuffer();
}

describe("conservative near-copy detection", () => {
  it("finds identical and re-encoded copies", async () => {
    const source = await fixture();
    const encoded = await sharp(source).resize(320, 240).jpeg({ quality: 85 }).toBuffer();
    const fingerprints = await Promise.all([source, encoded, source].map(fingerprintImage));
    expect(duplicatePairs(fingerprints)).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ]);
  });
  it("keeps genuinely changed furniture and palette despite the same room background", async () => {
    const a = await fingerprintImage(await fixture());
    const b = await fingerprintImage(await fixture(true));
    expect(compareFingerprints(a, b).nearDuplicate).toBe(false);
    expect(duplicatePairs([a, b])).toEqual([]);
  });
  it("rejects corrupt bytes instead of treating them as a duplicate", async () => {
    await expect(fingerprintImage(Buffer.from("invalid"))).rejects.toThrow();
  });
});
