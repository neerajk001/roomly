import type { UploadTarget } from "@roomdesigner/shared";
import { getServerEnv } from "@roomdesigner/config/env";
import * as cloudinary from "./cloudinary";
import * as s3 from "./s3";
import type { HeadResult, PresignPutInput, PutObjectInput } from "./types";

export {
  ACCEPTED_IMAGE_MIMES,
  ImageError,
  MAX_LONG_SIDE,
  MAX_UPLOAD_BYTES,
  THUMB_LONG_SIDE,
  WEB_LONG_SIDE,
  inspectImage,
  isAcceptedImageMime,
  makeThumbnail,
  makeWebVersion,
  normalizeUpload,
  type AcceptedImageMime,
  type ImageErrorCode,
  type ImageInfo,
} from "./images";
export { buildStorageKey, extensionForMime } from "./keys";
export type { HeadResult, PresignPutInput, PutObjectInput } from "./types";
export { applyWatermark } from "./watermark";
export { fingerprintImage, compareFingerprints, duplicatePairs } from "./image-similarity";

function usesCloudinary(): boolean {
  return getServerEnv().STORAGE_PROVIDER === "cloudinary";
}

export async function presignPut(input: PresignPutInput): Promise<UploadTarget> {
  return usesCloudinary() ? cloudinary.presignPut(input) : s3.presignPut(input);
}

export async function presignGet(
  key: string,
  expiresInSeconds?: number,
  options?: { downloadName?: string },
): Promise<string> {
  return usesCloudinary()
    ? cloudinary.presignGet(key, expiresInSeconds, options)
    : s3.presignGet(key, expiresInSeconds, options);
}

export async function headObject(key: string): Promise<HeadResult> {
  return usesCloudinary() ? cloudinary.headObject(key) : s3.headObject(key);
}

export async function getObject(key: string): Promise<Buffer> {
  return usesCloudinary() ? cloudinary.getObject(key) : s3.getObject(key);
}

export async function putObject(input: PutObjectInput): Promise<void> {
  return usesCloudinary() ? cloudinary.putObject(input) : s3.putObject(input);
}

export async function deleteObject(key: string): Promise<void> {
  return usesCloudinary() ? cloudinary.deleteObject(key) : s3.deleteObject(key);
}
