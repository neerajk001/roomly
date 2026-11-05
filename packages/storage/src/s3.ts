import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "@roomdesigner/config/env";
import type { UploadTarget } from "@roomdesigner/shared";
import type { HeadResult, PresignPutInput, PutObjectInput } from "./types";

let cachedClient: S3Client | undefined;

export function getS3Client(): S3Client {
  if (cachedClient !== undefined) return cachedClient;
  const env = getServerEnv();
  if (env.S3_ACCESS_KEY_ID === "" || env.S3_SECRET_ACCESS_KEY === "") {
    throw new Error("S3 credentials are not configured (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY)");
  }
  cachedClient = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    // MinIO and R2 both need path-style addressing on a custom endpoint.
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

function bucket(): string {
  return getServerEnv().S3_BUCKET;
}

const UPLOAD_EXPIRY_SECONDS = 10 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 60 * 60;

export async function presignPut(input: PresignPutInput): Promise<UploadTarget> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: input.key,
    ContentType: input.contentType,
    ...(input.contentLength !== undefined ? { ContentLength: input.contentLength } : {}),
  });
  const url = await getSignedUrl(getS3Client(), command, {
    expiresIn: input.expiresInSeconds ?? UPLOAD_EXPIRY_SECONDS,
  });
  return { url, method: "PUT", headers: { "content-type": input.contentType } };
}

/** Signed GET URLs are generated on demand and never stored. */
export async function presignGet(
  key: string,
  expiresInSeconds = DOWNLOAD_EXPIRY_SECONDS,
  options?: { downloadName?: string },
): Promise<string> {
  const safeName = options?.downloadName?.replace(/[^a-zA-Z0-9._-]/g, "");
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    ...(safeName !== undefined && safeName !== ""
      ? { ResponseContentDisposition: `attachment; filename="${safeName}"` }
      : {}),
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

export async function headObject(key: string): Promise<HeadResult> {
  try {
    const result = await getS3Client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return {
      exists: true,
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { exists: false, contentLength: 0, contentType: undefined };
    }
    throw error;
  }
}

export async function getObject(key: string): Promise<Buffer> {
  const result = await getS3Client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const body = result.Body;
  if (body === undefined) {
    throw new Error("Empty S3 object body");
  }
  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObject(input: PutObjectInput): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "private, max-age=31536000, immutable",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === "NotFound" || name === "NoSuchKey" || name === "404";
}
