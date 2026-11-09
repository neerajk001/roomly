import { CONSERVATIVE_IMAGE_COST_MICROS } from "@roomdesigner/ai";
import { renderParamsSchema, type RenderParams } from "./render-params";
import { dailyAiSpendMicros, type Prisma } from "@roomdesigner/db";

/** The false→true JSON update makes the single allowance survive queue retries. */
export async function claimDiversityRetry(
  db: Prisma,
  input: {
    jobId: string;
    workspaceId: string;
    params: RenderParams;
    initialCostMicros: number;
    limitMicros: number;
  },
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    // Global administrative spend guard, matching createRender; never returned to a tenant.
    const spent = await dailyAiSpendMicros(tx);
    if (spent + input.initialCostMicros + CONSERVATIVE_IMAGE_COST_MICROS >= input.limitMicros)
      return false;
    // Preserve the existing JSON fields without accepting an unchecked queue payload.
    const params = renderParamsSchema.parse(input.params);
    const claim = await tx.renderJob.updateMany({
      where: {
        id: input.jobId,
        workspaceId: input.workspaceId,
        status: "RUNNING",
        params: { path: ["diversityRetryUsed"], equals: false },
      },
      data: { params: { ...params, diversityRetryUsed: true } },
    });
    return claim.count === 1;
  });
}

/** Row lock keeps a late metadata write from resetting another worker's retry claim. */
export async function recordDiversityResult(
  db: Prisma,
  input: {
    jobId: string;
    workspaceId: string;
    extraCostMicros: number;
    report?: { similarConcepts: boolean; retryUsed: boolean };
  },
): Promise<void> {
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { params: unknown }[]
    >`SELECT "params" FROM "RenderJob" WHERE "id" = ${input.jobId} AND "workspaceId" = ${input.workspaceId} FOR UPDATE`;
    const current = renderParamsSchema.parse(rows[0]?.params);
    await tx.renderJob.update({
      where: { id: input.jobId, workspaceId: input.workspaceId },
      data: {
        costMicros: { increment: input.extraCostMicros },
        params: {
          ...current,
          conceptPlanVersion: 1,
          ...(input.report
            ? {
                diversityReport: {
                  ...input.report,
                  retryUsed: current.diversityRetryUsed === true || input.report.retryUsed,
                },
              }
            : {}),
        },
      },
    });
  });
}
