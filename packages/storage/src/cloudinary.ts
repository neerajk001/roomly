import { getServerEnv } from "@roomdesigner/config/env";
import type { UploadTarget } from "@roomdesigner/shared";
import { v2 as cloudinary } from "cloudinary";
import type { HeadResult, PresignPutInput, PutObjectInput } from "./types";

const IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

export interface CloudinaryAsset {
  publicId: string;
  format: string;
  resourceType: "image" | "raw";
}

/**
 * Maps a storage key to Cloudinary's identifiers. Image public IDs must not
 * include an extension; raw public IDs must. PDFs are treated as images by
 * Cloudinary and are stored the same way as other visual assets.
 */
export function cloudinaryAssetForKey(key: string): CloudinaryAsset {
  const extension = /\.([a-z0-9]+)$/i.exec(key)?.[1]?.toLowerCase();
  if (extension !== undefined && IMAGE_FORMATS.has(extension)) {
    const format = extension === "jpeg" ? "jpg" : extension;
    return {
      publicId: key.slice(0, key.length - extension.length - 1),
      format,
      resourceType: "image",
    };
  }
  return { publicId: key, format: extension ?? "", resourceType: "raw" };
}

function allowedFormatsFor(contentType: string): string | undefined {
  switch (contentType) {
    case "image/jpeg":
      return "jpg,jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return undefined;
  }
}

function contentTypeFor(format: string): string | undefined {
  switch (format.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    default:
      return undefined;
  }
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

let configuredFor: string | undefined;

function configure(): CloudinaryConfig {
  const env = getServerEnv();
  if (
    env.CLOUDINARY_CLOUD_NAME === undefined ||
    env.CLOUDINARY_CLOUD_NAME === "" ||
    env.CLOUDINARY_API_KEY === undefined ||
    env.CLOUDINARY_API_KEY === "" ||
    env.CLOUDINARY_API_SECRET === undefined ||
    env.CLOUDINARY_API_SECRET === ""
  ) {
    throw new Error(
      "STORAGE_PROVIDER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET",
    );
  }
  const key = `${env.CLOUDINARY_CLOUD_NAME}:${env.CLOUDINARY_API_KEY}`;
  if (configuredFor !== key) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configuredFor = key;
  }
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

/** Pure helper (no network) so the signed direct-upload shape can be tested. */
export function createCloudinaryUploadTarget(input: {
  key: string;
  contentType: string;
  config: CloudinaryConfig;
  now?: Date;
}): UploadTarget {
  const asset = cloudinaryAssetForKey(input.key);
  const timestamp = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const allowedFormats = allowedFormatsFor(input.contentType);
  const signedParams: Record<string, string> = {
    timestamp: String(timestamp),
    public_id: asset.publicId,
    type: "private",
    ...(allowedFormats === undefined ? {} : { allowed_formats: allowedFormats }),
  };
  const signature = cloudinary.utils.api_sign_request(signedParams, input.config.apiSecret);
  return {
    url: `https://api.cloudinary.com/v1_1/${input.config.cloudName}/${asset.resourceType}/upload`,
    method: "POST",
    headers: {},
    fields: { ...signedParams, api_key: input.config.apiKey, signature },
  };
}

export async function presignPut(input: PresignPutInput): Promise<UploadTarget> {
  return createCloudinaryUploadTarget({
    key: input.key,
    contentType: input.contentType,
    config: configure(),
  });
}

/** Time-limited signed URL for a private asset. */
export async function presignGet(
  key: string,
  expiresInSeconds = 3_600,
  options?: { downloadName?: string },
): Promise<string> {
  configure();
  const asset = cloudinaryAssetForKey(key);
  return cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    attachment: options?.downloadName !== undefined,
  });
}

export async function headObject(key: string): Promise<HeadResult> {
  configure();
  const asset = cloudinaryAssetForKey(key);
  try {
    const result = await cloudinary.api.resource(asset.publicId, {
      resource_type: asset.resourceType,
      type: "private",
    });
    return {
      exists: true,
      contentLength: typeof result.bytes === "number" ? result.bytes : 0,
      contentType:
        typeof result.format === "string"
          ? contentTypeFor(result.format)
          : contentTypeFor(asset.format),
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { exists: false, contentLength: 0, contentType: undefined };
    }
    throw error;
  }
}

export async function getObject(key: string): Promise<Buffer> {
  const url = await presignGet(key, 300);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cloudinary download failed (${String(response.status)})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function putObject(input: PutObjectInput): Promise<void> {
  configure();
  const asset = cloudinaryAssetForKey(input.key);
  await new Promise<void>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: asset.publicId,
        resource_type: asset.resourceType,
        type: "private",
        overwrite: true,
        invalidate: true,
        ...(asset.resourceType === "image" ? { format: asset.format } : {}),
      },
      (error, result) => {
        if (error !== undefined && error !== null) {
          reject(error);
          return;
        }
        if (result === undefined || result === null) {
          reject(new Error("Cloudinary returned no upload result"));
          return;
        }
        resolve();
      },
    );
    stream.end(input.body);
  });
}

export async function deleteObject(key: string): Promise<void> {
  configure();
  const asset = cloudinaryAssetForKey(key);
  await cloudinary.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType,
    type: "private",
    invalidate: true,
  });
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    http_code?: unknown;
    error?: { http_code?: unknown; message?: unknown };
    message?: unknown;
  };
  const status = candidate.http_code ?? candidate.error?.http_code;
  if (status === 404) return true;
  const message = candidate.error?.message ?? candidate.message;
  return typeof message === "string" && /not found/i.test(message);
}
