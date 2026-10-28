import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, type TransactionClient } from "./index";
import { InsufficientCreditsError, getBalance, refundCredits, reserveCredits } from "./credits";

const suffix = crypto.randomUUID();
const userIds: string[] = [];
let workspaceId = "";

async function createWorkspace(balance: number): Promise<string> {
  const owner = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Credits Owner",
      email: `credits-${suffix}-${crypto.randomUUID()}@example.test`,
      emailVerified: true,
    },
  });
  userIds.push(owner.id);
  const workspace = await prisma.workspace.create({
    data: { name: "Credits WS", ownerId: owner.id },
  });
  if (balance > 0) {
    await prisma.creditLedger.create({
      data: {
        workspaceId: workspace.id,
        delta: balance,
        reason: "ADJUSTMENT",
        refId: `seed-${workspace.id}`,
      },
    });
  }
  return workspace.id;
}

function jobId(): string {
  return `job-${crypto.randomUUID()}`;
}

beforeAll(async () => {
  workspaceId = await createWorkspace(10);
});

afterAll(async () => {
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: { in: userIds } },
    select: { id: true },
  });
  const ids = workspaces.map((w) => w.id);
  await prisma.creditLedger.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: ids } } });
  await prisma.workspace.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("credits", () => {
  it("reports the ledger balance", async () => {
    expect(await getBalance(prisma, workspaceId)).toBe(10);
  });

  it("reserves credits in a transaction", async () => {
    const id = jobId();
    await prisma.$transaction(async (tx: TransactionClient) => {
      await reserveCredits(tx, { workspaceId, jobId: id, cost: 4 });
    });
    expect(await getBalance(prisma, workspaceId)).toBe(6);
  });

  it("refuses to overspend", async () => {
    const id = jobId();
    await expect(
      prisma.$transaction(async (tx: TransactionClient) => {
        await reserveCredits(tx, { workspaceId, jobId: id, cost: 999 });
      }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await getBalance(prisma, workspaceId)).toBe(6);
  });

  it("serialises concurrent reserves so only one can take the last credits", async () => {
    const ws = await createWorkspace(4);
    const attempts = await Promise.allSettled([
      prisma.$transaction(async (tx: TransactionClient) => {
        await reserveCredits(tx, { workspaceId: ws, jobId: jobId(), cost: 4 });
      }),
      prisma.$transaction(async (tx: TransactionClient) => {
        await reserveCredits(tx, { workspaceId: ws, jobId: jobId(), cost: 4 });
      }),
    ]);
    const fulfilled = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await getBalance(prisma, ws)).toBe(0);
  });

  it("refunds idempotently", async () => {
    const ws = await createWorkspace(0);
    const id = jobId();
    await prisma.creditLedger.create({
      data: {
        workspaceId: ws,
        delta: -3,
        reason: "RENDER_RESERVE",
        refId: id,
      },
    });
    await refundCredits(prisma, { workspaceId: ws, jobId: id, cost: 3 });
    await refundCredits(prisma, { workspaceId: ws, jobId: id, cost: 3 });
    expect(await getBalance(prisma, ws)).toBe(0);
    const refunds = await prisma.creditLedger.count({
      where: { workspaceId: ws, reason: "RENDER_REFUND", refId: id },
    });
    expect(refunds).toBe(1);
  });
});
