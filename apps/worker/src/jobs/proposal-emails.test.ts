import { prisma } from "@roomdesigner/db";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { processProposalEmails } from "./proposal-emails";
let userId = "";
let workspaceId = "";
let proposalId = "";
beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Mail test",
      email: `${crypto.randomUUID()}@example.test`,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { ownerId: userId, name: "Mail workspace" },
  });
  workspaceId = workspace.id;
  const project = await prisma.project.create({ data: { workspaceId, name: "Mail project" } });
  const estimate = await prisma.estimate.create({
    data: {
      projectId: project.id,
      currency: "USD",
      subtotalMinor: 0,
      markupMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    },
  });
  const proposal = await prisma.proposal.create({
    data: {
      projectId: project.id,
      estimateId: estimate.id,
      title: "Mail proposal",
      status: "SENT",
      publicToken: crypto.randomUUID(),
      renderOutputIds: [],
      snapshot: {
        clientEmail: "client@example.test",
        clientName: "Client",
        title: "Mail proposal",
      },
    },
  });
  proposalId = proposal.id;
});
afterAll(async () => {
  await prisma.proposal.deleteMany({ where: { project: { workspaceId } } });
  await prisma.estimate.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});
describe("proposal email outbox", () => {
  it("sends once with a stable idempotency key", async () => {
    const event = await prisma.proposalEmail.create({
      data: { workspaceId, proposalId, kind: "SENT", dedupeKey: crypto.randomUUID() },
    });
    const send = vi.fn().mockResolvedValue(undefined);
    await processProposalEmails({
      db: prisma,
      sender: { send },
      appUrl: "http://localhost:3001",
      workspaceId,
    });
    await processProposalEmails({
      db: prisma,
      sender: { send },
      appUrl: "http://localhost:3001",
      workspaceId,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      idempotencyKey: `proposal-event/${event.id}`,
      to: "client@example.test",
    });
  });
  it("retains failed events for a later retry", async () => {
    const event = await prisma.proposalEmail.create({
      data: { workspaceId, proposalId, kind: "COMMENT", dedupeKey: crypto.randomUUID() },
    });
    const now = new Date();
    const send = vi.fn().mockRejectedValue(new Error("Temporary delivery failure"));
    expect(
      (
        await processProposalEmails({
          db: prisma,
          sender: { send },
          appUrl: "http://localhost:3001",
          workspaceId,
          now,
        })
      ).failed,
    ).toBe(1);
    const pending = await prisma.proposalEmail.findFirstOrThrow({
      where: { id: event.id, workspaceId },
    });
    expect(pending.sentAt).toBeNull();
    const retry = vi.fn().mockResolvedValue(undefined);
    await processProposalEmails({
      db: prisma,
      sender: { send: retry },
      appUrl: "http://localhost:3001",
      workspaceId,
      now: new Date(now.getTime() + 6 * 60000),
    });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
