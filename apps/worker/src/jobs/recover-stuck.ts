import { refundCredits, type Prisma } from "@roomdesigner/db";

export interface RecoverStuckDeps {
  db: Prisma;
  now: Date;
  timeoutMinutes?: number;
}

/**
 * Fails and refunds jobs left RUNNING after a timeout (worker crash, provider
 * hang, deploy mid-job). Idempotent: refunds use the ledger unique key.
 */
export async function recoverStuckJobs(deps: RecoverStuckDeps): Promise<number> {
  const timeoutMinutes = deps.timeoutMinutes ?? 10;
  const cutoff = new Date(deps.now.getTime() - timeoutMinutes * 60 * 1000);
  const stuck = await deps.db.renderJob.findMany({
    where: { status: "RUNNING", startedAt: { lt: cutoff } },
    select: { id: true, workspaceId: true, creditsCharged: true },
    take: 100,
  });

  for (const job of stuck) {
    await deps.db.renderJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorCode: "STUCK",
        errorMessage: "The render timed out. Credits were refunded.",
        finishedAt: deps.now,
      },
    });
    await refundCredits(deps.db, {
      workspaceId: job.workspaceId,
      jobId: job.id,
      cost: job.creditsCharged,
    });
  }
  return stuck.length;
}
