import type { Prisma } from "@roomdesigner/db";

export interface CleanupDeps {
  db: Prisma;
  deleteObject(key: string): Promise<void>;
  uploadsRetentionHours?: number;
}

/**
 * Deletes uploads that were never confirmed (abandoned presigned uploads and
 * their thumbnails) once they are older than the retention window.
 */
export async function cleanupUnconfirmedAssets(deps: CleanupDeps): Promise<number> {
  const retentionHours = deps.uploadsRetentionHours ?? 24;
  const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

  const assets = await deps.db.asset.findMany({
    where: { confirmedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, storageKey: true },
    take: 500,
  });

  let removed = 0;
  for (const asset of assets) {
    try {
      await deps.deleteObject(asset.storageKey);
    } catch {
      // Object may already be gone; the row is still safe to remove.
    }
    const deleted = await deps.db.asset.deleteMany({
      where: { id: asset.id, confirmedAt: null },
    });
    removed += deleted.count;
  }
  return removed;
}
