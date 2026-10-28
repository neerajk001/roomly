import sharp from "sharp";

export const ACCEPTED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageMime = (typeof ACCEPTED_IMAGE_MIMES)[number];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_LONG_SIDE = 4096;
export const THUMB_LONG_SIDE = 512;
export const WEB_LONG_SIDE = 2048;

export type ImageErrorCode = "INVALID_IMAGE" | "IMAGE_TOO_LARGE" | "UNSUPPORTED_IMAGE_TYPE";

export class ImageError extends Error {
  readonly code: ImageErrorCode;

  constructor(code: ImageErrorCode, message: string) {
    super(message);
    this.name = "ImageError";
    this.code = code;
  }
}

export function isAcceptedImageMime(mime: string): mime is AcceptedImageMime {
  return (ACCEPTED_IMAGE_MIMES as readonly string[]).includes(mime);
}

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
}

/** Parses the header only; corrupt or non-image bytes throw ImageError. */
export async function inspectImage(buffer: Buffer): Promise<ImageInfo> {
  try {
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();
    if (metadata.width === undefined || metadata.height === undefined) {
      throw new ImageError("INVALID_IMAGE", "The file is not a readable image.");
    }
    return { width: metadata.width, height: metadata.height, format: metadata.format ?? "unknown" };
  } catch (error) {
    if (error instanceof ImageError) throw error;
    throw new ImageError("INVALID_IMAGE", "The file is not a readable image.");
  }
}

async function encode(
  input: Buffer,
  format: AcceptedImageMime,
  maxLongSide: number,
  quality: number,
): Promise<{ data: Buffer; mime: AcceptedImageMime; width: number; height: number }> {
  // `.rotate()` applies EXIF orientation; re-encoding drops all metadata
  // (including GPS) because sharp only keeps it when asked via withMetadata().
  const pipeline = sharp(input, { failOn: "error" }).rotate().resize({
    width: maxLongSide,
    height: maxLongSide,
    fit: "inside",
    withoutEnlargement: true,
  });

  const data =
    format === "image/png"
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : format === "image/webp"
        ? await pipeline.webp({ quality }).toBuffer()
        : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  const metadata = await sharp(data).metadata();
  return {
    data,
    mime: format,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

/**
 * Validates an uploaded image and re-encodes it without EXIF. Enforces the
 * 4096 px long-side cap on the *normalised* image.
 */
export async function normalizeUpload(
  buffer: Buffer,
  mime: string,
): Promise<{ data: Buffer; mime: AcceptedImageMime; width: number; height: number }> {
  if (!isAcceptedImageMime(mime)) {
    throw new ImageError("UNSUPPORTED_IMAGE_TYPE", "Only JPEG, PNG or WebP images are supported.");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageError("IMAGE_TOO_LARGE", "Images must be 10 MB or smaller.");
  }

  const info = await inspectImage(buffer);
  if (Math.max(info.width, info.height) > MAX_LONG_SIDE) {
    throw new ImageError("INVALID_IMAGE", "Images must be at most 4096 px on the long side.");
  }

  return encode(buffer, mime, MAX_LONG_SIDE, 88);
}

/** Web version served in the UI (max 2048 px, JPEG). */
export async function makeWebVersion(
  buffer: Buffer,
  maxLongSide: number = WEB_LONG_SIDE,
): Promise<{ data: Buffer; mime: string }> {
  const result = await encode(buffer, "image/jpeg", maxLongSide, 91);
  return { data: result.data, mime: result.mime };
}

/** Grid thumbnail (max 512 px, JPEG). */
export async function makeThumbnail(buffer: Buffer): Promise<{ data: Buffer; mime: string }> {
  const result = await encode(buffer, "image/jpeg", THUMB_LONG_SIDE, 78);
  return { data: result.data, mime: result.mime };
}
