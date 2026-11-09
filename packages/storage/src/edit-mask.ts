import sharp from "sharp";
import { editRegionSchema, type EditRegion } from "@roomdesigner/shared";

function pixelRegion(region: EditRegion, width: number, height: number) {
  const r = editRegionSchema.parse(region);
  const left = Math.floor((r.left * width) / 1000);
  const top = Math.floor((r.top * height) / 1000);
  const right = Math.min(width, Math.ceil((r.right * width) / 1000));
  const bottom = Math.min(height, Math.ceil((r.bottom * height) / 1000));
  return { left, top, width: right - left, height: bottom - top };
}

/** Normalize both mask and source together; do not trust browser dimensions. */
export async function prepareMaskedEdit(source: Buffer, region: EditRegion) {
  const { data: image, info } = await sharp(source, {
    failOn: "error",
    limitInputPixels: 4096 * 4096,
  })
    .rotate()
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });
  const box = pixelRegion(region, info.width, info.height);
  const alpha = Buffer.alloc(info.width * info.height * 4, 255);
  for (let y = box.top; y < box.top + box.height; y++)
    for (let x = box.left; x < box.left + box.width; x++) alpha[(y * info.width + x) * 4 + 3] = 0;
  const mask = await sharp(alpha, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
  return { image, mask, width: info.width, height: info.height };
}

/** Only accept generated pixels inside the reviewed rectangle. Lossless output. */
export async function compositeSelectedArea(
  source: Buffer,
  generated: Buffer,
  region: EditRegion,
): Promise<Buffer> {
  const base = await sharp(source).rotate().ensureAlpha().png().toBuffer();
  const info = await sharp(base).metadata();
  if (!info.width || !info.height) throw new Error("Invalid source dimensions.");
  const box = pixelRegion(region, info.width, info.height);
  const normalized = await sharp(generated, { failOn: "error", limitInputPixels: 4096 * 4096 })
    .rotate()
    .resize(info.width, info.height, { fit: "fill" })
    .removeAlpha()
    .png()
    .toBuffer();
  const patch = await sharp(normalized).extract(box).toBuffer();
  return sharp(base)
    .composite([{ input: patch, left: box.left, top: box.top }])
    .png()
    .toBuffer();
}
