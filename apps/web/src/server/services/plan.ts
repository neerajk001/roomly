import type { Prisma } from "@roomdesigner/db";

export type PlanState = "FREE" | "PAID";

/**
 * Plan state for gating. V3 has no plans yet, so every workspace is FREE.
 * V5 will read the Subscription row; this helper stays the single source.
 */
export async function getPlanState(db: Prisma, workspaceId: string): Promise<PlanState> {
  const subscription = await db.subscription.findUnique({
    where: { workspaceId },
    select: { status: true },
  });
  if (subscription === null) return "FREE";
  return subscription.status === "ACTIVE" || subscription.status === "TRIALING" ? "PAID" : "FREE";
}
