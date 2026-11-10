import type { Prisma, TransactionClient } from "./index";

export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";

  constructor(
    readonly balance: number,
    readonly required: number,
  ) {
    super("Not enough credits for this render.");
    this.name = "InsufficientCreditsError";
  }
}

/** Balance = SUM(delta) of the append-only ledger. */
export async function getBalance(db: Prisma, workspaceId: string): Promise<number> {
  const aggregate = await db.creditLedger.aggregate({
    where: { workspaceId },
    _sum: { delta: true },
  });
  return aggregate._sum.delta ?? 0;
}

/**
 * Reserves credits inside an existing transaction. The workspace row is locked
 * first so concurrent reserves for the same workspace cannot overspend.
 */
export async function reserveCredits(
  tx: TransactionClient,
  input: { workspaceId: string; jobId: string; cost: number },
): Promise<void> {
  if (input.cost <= 0) return;

  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${input.workspaceId} FOR UPDATE`;

  const aggregate = await tx.creditLedger.aggregate({
    where: { workspaceId: input.workspaceId },
    _sum: { delta: true },
  });
  const balance = aggregate._sum.delta ?? 0;
  if (balance < input.cost) {
    throw new InsufficientCreditsError(balance, input.cost);
  }

  await tx.creditLedger.create({
    data: {
      workspaceId: input.workspaceId,
      delta: -input.cost,
      reason: "RENDER_RESERVE",
      refId: input.jobId,
    },
  });
}

/**
 * Refunds a reserved job. Idempotent: the unique (reason, refId) constraint
 * makes a second refund a no-op.
 */
export async function refundCredits(
  db: Pick<Prisma, "creditLedger">,
  input: { workspaceId: string; jobId: string; cost: number },
): Promise<void> {
  if (input.cost <= 0) return;
  await db.creditLedger.createMany({
    data: [
      {
        workspaceId: input.workspaceId,
        delta: input.cost,
        reason: "RENDER_REFUND",
        refId: input.jobId,
      },
    ],
    skipDuplicates: true,
  });
}
