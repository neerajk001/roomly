import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ImageError,
  MAX_UPLOAD_BYTES,
  inspectImage,
  makeThumbnail,
  makeWebVersion,
  normalizeUpload,
} from "./images";

async function jpegWithExif(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 180, g: 170, b: 160 } },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "test" } })
    .toBuffer();
}

describe("normalizeUpload", () => {
  it("re-encodes and strips EXIF/GPS", async () => {
    const source = await jpegWithExif();
    const before = await sharp(source).metadata();
    expect(before.exif).toBeDefined();

    const result = await normalizeUpload(source, "image/jpeg");
    const after = await sharp(result.data).metadata();
    expect(after.exif).toBeUndefined();
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("rejects a corrupt file that pretends to be a JPEG", async () => {
    await expect(
      normalizeUpload(Buffer.from("this is definitely not an image"), "image/jpeg"),
    ).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });

  it("rejects unsupported mime types", async () => {
    await expect(normalizeUpload(Buffer.from("x"), "image/gif")).rejects.toBeInstanceOf(ImageError);
  });

  it("rejects files larger than 10 MB", async () => {
    const huge = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    await expect(normalizeUpload(huge, "image/jpeg")).rejects.toMatchObject({
      code: "IMAGE_TOO_LARGE",
    });
  });

  it("rejects images over 4096 px on the long side", async () => {
    const wide = await sharp({
      create: { width: 5000, height: 100, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();
    await expect(normalizeUpload(wide, "image/jpeg")).rejects.toMatchObject({
      code: "INVALID_IMAGE",
    });
  });
});

describe("derivatives", () => {
  it("creates a <=512px thumbnail and a <=2048px web version", async () => {
    const source = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 100, g: 110, b: 120 } },
    })
      .jpeg()
      .toBuffer();

    const thumb = await makeThumbnail(source);
    const web = await makeWebVersion(source);

    const thumbMeta = await sharp(thumb.data).metadata();
    const webMeta = await sharp(web.data).metadata();
    expect(Math.max(thumbMeta.width ?? 0, thumbMeta.height ?? 0)).toBeLessThanOrEqual(512);
    expect(Math.max(webMeta.width ?? 0, webMeta.height ?? 0)).toBeLessThanOrEqual(2048);
  });

  it("inspectImage reports dimensions", async () => {
    const source = await jpegWithExif();
    const info = await inspectImage(source);
    expect(info.width).toBe(800);
    expect(info.format).toBe("jpeg");
  });
});
