import type { Prisma } from "@roomdesigner/db";
import {
  buildStorageKey,
  getObject,
  headObject,
  makeThumbnail,
  normalizeUpload,
  presignPut,
  putObject,
  MAX_UPLOAD_BYTES,
} from "@roomdesigner/storage";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError } from "../app-error";

export interface UploadContext {
  userId: string;
  workspaceId: string;
}

export const presignInputSchema = z.object({
  kind: z.enum(["ORIGINAL_PHOTO", "BRIEF_UPLOAD", "LOGO"]).default("ORIGINAL_PHOTO"),
  roomId: z.string().min(1).max(64).optional(),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, "Images must be 10 MB or smaller."),
});

export interface PresignResult {
  assetId: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
}

const UPLOAD_EXPIRY_SECONDS = 600;
const MAX_PHOTOS_PER_ROOM = 3;

/** Creates an unconfirmed Asset and a presigned PUT URL for the browser. */
export async function createUploadPresign(
  db: Prisma,
  ctx: UploadContext,
  input: z.infer<typeof presignInputSchema>,
): Promise<PresignResult> {
  if (input.kind !== "ORIGINAL_PHOTO") {
    const asset = await db.asset.create({
      data: {
        workspaceId: ctx.workspaceId,
        roomId: null,
        kind: input.kind,
        storageKey: `pending/${randomUUID()}`,
        mime: input.mime,
        sizeBytes: input.sizeBytes,
      },
    });
    const storageKey = buildStorageKey({
      workspaceId: ctx.workspaceId,
      kind: input.kind,
      assetId: asset.id,
      mime: input.mime,
    });
    await db.asset.update({ where: { id: asset.id }, data: { storageKey } });
    const uploadUrl = await presignPut({
      key: storageKey,
      contentType: input.mime,
      contentLength: input.sizeBytes,
      expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
    });
    return {
      assetId: asset.id,
      uploadUrl,
      headers: { "content-type": input.mime },
      expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
    };
  }

  let roomId: string | null = null;
  if (input.roomId !== undefined) {
    const room = await db.room.findFirst({
      where: { id: input.roomId, project: { workspaceId: ctx.workspaceId } },
      select: { id: true },
    });
    if (room === null) {
      throw new AppError("NOT_FOUND", "Room not found.", 404);
    }
    roomId = room.id;
    const existing = await db.asset.count({
      where: {
        roomId: room.id,
        kind: "ORIGINAL_PHOTO",
        OR: [
          { confirmedAt: { not: null } },
          { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    if (existing >= MAX_PHOTOS_PER_ROOM) {
      throw new AppError("PHOTO_LIMIT", "Each room supports up to 3 photos.", 400);
    }
  }

  // The key embeds the database id, so the row is created first with a unique
  // placeholder key and immediately updated.
  const asset = await db.asset.create({
    data: {
      workspaceId: ctx.workspaceId,
      roomId,
      kind: "ORIGINAL_PHOTO",
      storageKey: `pending/${randomUUID()}`,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
    },
  });

  const storageKey = buildStorageKey({
    workspaceId: ctx.workspaceId,
    kind: "ORIGINAL_PHOTO",
    assetId: asset.id,
    mime: input.mime,
  });
  await db.asset.update({ where: { id: asset.id }, data: { storageKey } });

  const uploadUrl = await presignPut({
    key: storageKey,
    contentType: input.mime,
    contentLength: input.sizeBytes,
    expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
  });

  return {
    assetId: asset.id,
    uploadUrl,
    headers: { "content-type": input.mime },
    expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
  };
}

export interface ConfirmedAsset {
  id: string;
  width: number;
  height: number;
  sizeBytes: number;
  mime: string;
  thumbnailAssetId: string | null;
}

/**
 * Verifies the uploaded object, re-encodes it (strips EXIF/GPS), stores a
 * thumbnail and marks the asset confirmed. Idempotent for repeated calls.
 */
export async function confirmUpload(
  db: Prisma,
  ctx: UploadContext,
  assetId: string,
  expectedKind?: "ORIGINAL_PHOTO" | "BRIEF_UPLOAD" | "LOGO",
): Promise<ConfirmedAsset> {
  const asset = await db.asset.findFirst({
    where: { id: assetId, workspaceId: ctx.workspaceId },
  });
  if (asset === null) {
    throw new AppError("NOT_FOUND", "Upload not found.", 404);
  }
  if (expectedKind !== undefined && asset.kind !== expectedKind) {
    throw new AppError("NOT_FOUND", "Upload not found.", 404);
  }
  if (asset.confirmedAt !== null) {
    return {
      id: asset.id,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      sizeBytes: asset.sizeBytes,
      mime: asset.mime,
      thumbnailAssetId: null,
    };
  }

  const head = await headObject(asset.storageKey);
  if (!head.exists || head.contentLength === 0) {
    throw new AppError("UPLOAD_MISSING", "The upload did not arrive. Try again.", 400);
  }
  if (head.contentLength > MAX_UPLOAD_BYTES) {
    throw new AppError("IMAGE_TOO_LARGE", "Images must be 10 MB or smaller.", 400);
  }

  const original = await getObject(asset.storageKey);
  const normalized = await normalizeUpload(original, asset.mime);

  await putObject({
    key: asset.storageKey,
    body: normalized.data,
    contentType: normalized.mime,
  });

  const thumbnail = await makeThumbnail(normalized.data);
  const thumbAsset = await db.asset.create({
    data: {
      workspaceId: ctx.workspaceId,
      roomId: asset.roomId,
      kind: "THUMBNAIL",
      storageKey: `pending/${randomUUID()}`,
      mime: thumbnail.mime,
      sizeBytes: thumbnail.data.byteLength,
    },
  });
  const thumbKey = buildStorageKey({
    workspaceId: ctx.workspaceId,
    kind: "THUMBNAIL",
    assetId: thumbAsset.id,
    mime: thumbnail.mime,
  });
  await putObject({ key: thumbKey, body: thumbnail.data, contentType: thumbnail.mime });
  await db.asset.update({ where: { id: thumbAsset.id }, data: { storageKey: thumbKey } });

  const updated = await db.asset.update({
    where: { id: asset.id },
    data: {
      confirmedAt: new Date(),
      width: normalized.width,
      height: normalized.height,
      sizeBytes: normalized.data.byteLength,
      mime: normalized.mime,
    },
  });

  return {
    id: updated.id,
    width: normalized.width,
    height: normalized.height,
    sizeBytes: updated.sizeBytes,
    mime: updated.mime,
    thumbnailAssetId: thumbAsset.id,
  };
}
