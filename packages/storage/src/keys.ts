// Kept in sync with the Prisma AssetKind enum; storage never imports Prisma.
export type StorageAssetKind =
  | "ORIGINAL_PHOTO"
  | "RENDER"
  | "THUMBNAIL"
  | "LOGO"
  | "BRIEF_UPLOAD";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForMime(mime: string): string | undefined {
  return EXT_BY_MIME[mime];
}

/**
 * Storage keys never contain user-supplied names:
 * `ws/{workspaceId}/{kind}/{assetId}.{ext}` (thumbnails get a `_thumb` suffix).
 */
export function buildStorageKey(input: {
  workspaceId: string;
  kind: StorageAssetKind;
  assetId: string;
  mime: string;
  variant?: "thumb";
}): string {
  const ext = extensionForMime(input.mime);
  if (ext === undefined) {
    throw new Error(`Unsupported mime type: ${input.mime}`);
  }
  const suffix = input.variant === "thumb" ? "_thumb" : "";
  return `ws/${input.workspaceId}/${input.kind}/${input.assetId}${suffix}.${ext}`;
}
