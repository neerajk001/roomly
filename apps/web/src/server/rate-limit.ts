import { prisma } from "@roomdesigner/db";

/**
 * Postgres-backed fixed-window rate limiter (single interface; swap for Redis
 * later without touching call sites). Async: callers must await it.
 *
 * Keys are short, non-PII strings (endpoint + token/IP hash from the caller).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count"
  `;
  const count = rows[0]?.count ?? 1;
  return count <= limit;
}

/** Best-effort cleanup of expired buckets (called opportunistically). */
export async function pruneRateLimits(): Promise<void> {
  await prisma.rateLimit
    .deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    .catch(() => undefined);
}
