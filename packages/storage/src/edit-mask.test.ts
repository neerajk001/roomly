import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareMaskedEdit, compositeSelectedArea } from "./edit-mask";

const region = { left: 200, top: 250, right: 600, bottom: 750 };
const solid = (width: number, height: number, background: string) =>
  sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();

describe("server-owned edit masks", () => {
  it("matches source dimensions and makes only the selected rectangle transparent", async () => {
    const result = await prepareMaskedEdit(await solid(100, 80, "red"), region);
    const { data, info } = await sharp(result.mask).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([100, 80, 4]);
    expect(data[(30 * 100 + 30) * 4 + 3]).toBe(0);
    expect(data[(10 * 100 + 10) * 4 + 3]).toBe(255);
    expect(data[(60 * 100 + 60) * 4 + 3]).toBe(255);
    const oriented = await sharp(await solid(100, 80, "red"))
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const normalized = await prepareMaskedEdit(oriented, region);
    expect([normalized.width, normalized.height]).toEqual([80, 100]);
  });
  it("preserves every outside pixel and source dimensions even when provider output changes the whole room", async () => {
    const source = await solid(100, 80, "red");
    const output = await compositeSelectedArea(source, await solid(40, 40, "blue"), region);
    const { data, info } = await sharp(output)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([100, 80]);
    for (let y = 0; y < 80; y++)
      for (let x = 0; x < 100; x++) {
        const inside = x >= 20 && x < 60 && y >= 20 && y < 60;
        expect([...data.subarray((y * 100 + x) * 3, (y * 100 + x) * 3 + 3)]).toEqual(
          inside ? [0, 0, 255] : [255, 0, 0],
        );
      }
    expect((await sharp(output).metadata()).format).toBe("png");
  });
  it("rejects invalid selection before constructing a mask", async () => {
    await expect(
      prepareMaskedEdit(await solid(10, 10, "red"), { ...region, right: -1 }),
    ).rejects.toThrow();
  });
});
