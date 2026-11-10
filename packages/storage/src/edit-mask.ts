import sharp from "sharp";
import { editRegionSchema, type EditRegion } from "@roomdesigner/shared";
import { makeThumbnail } from "./images";

function pixelRegion(region: EditRegion, width: number, height: number) {
  const r = editRegionSchema.parse(region);
  const left = Math.floor((r.left * width) / 1000);
  const top = Math.floor((r.top * height) / 1000);
  const right = Math.min(width, Math.ceil((r.right * width) / 1000));
  const bottom = Math.min(height, Math.ceil((r.bottom * height) / 1000));
  return { left, top, width: right - left, height: bottom - top };
}

/** Private transient close-ups; order matches the validated selected regions. */
export async function makeSelectedAreaPreviews(source: Buffer, regions: EditRegion[]) {
  if (regions.length < 1 || regions.length > 5) throw new Error("Choose one to five regions.");
  const base = await sharp(source, { failOn: "error", limitInputPixels: 4096 * 4096 })
    .rotate()
    .png()
    .toBuffer();
  const info = await sharp(base).metadata();
  if (!info.width || !info.height) throw new Error("Invalid source dimensions.");
  const result: { image: Buffer; mime: string }[] = [];
  for (const region of regions) {
    const crop = await sharp(base)
      .extract(pixelRegion(region, info.width, info.height))
      .png()
      .toBuffer();
    const thumbnail = await makeThumbnail(crop);
    result.push({ image: thumbnail.data, mime: thumbnail.mime });
  }
  return result;
}

/** Normalize both mask and source together; do not trust browser dimensions. */
export async function prepareMaskedEdit(source: Buffer, region: EditRegion | EditRegion[]) {
  const { data: image, info } = await sharp(source, {
    failOn: "error",
    limitInputPixels: 4096 * 4096,
  })
    .rotate()
    .ensureAlpha()
    .png()
    .toBuffer({ resolveWithObject: true });
  const boxes = (Array.isArray(region) ? region : [region]).map((r) =>
    pixelRegion(r, info.width, info.height),
  );
  if (boxes.length < 1 || boxes.length > 5) throw new Error("Choose one to five regions.");
  const alpha = Buffer.alloc(info.width * info.height * 4, 255);
  for (const box of boxes)
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
  region: EditRegion | EditRegion[],
): Promise<Buffer> {
  const base = await sharp(source).rotate().ensureAlpha().png().toBuffer();
  const info = await sharp(base).metadata();
  if (!info.width || !info.height) throw new Error("Invalid source dimensions.");
  const boxes = (Array.isArray(region) ? region : [region]).map((r) =>
    pixelRegion(r, info.width!, info.height!),
  );
  if (boxes.length < 1 || boxes.length > 5) throw new Error("Choose one to five regions.");
  const normalized = await sharp(generated, { failOn: "error", limitInputPixels: 4096 * 4096 })
    .rotate()
    .resize(info.width, info.height, { fit: "fill" })
    .removeAlpha()
    .png()
    .toBuffer();
  const patches = await Promise.all(
    boxes.map(async (box) => ({
      input: await sharp(normalized).extract(box).toBuffer(),
      left: box.left,
      top: box.top,
    })),
  );
  return sharp(base).composite(patches).png().toBuffer();
}
