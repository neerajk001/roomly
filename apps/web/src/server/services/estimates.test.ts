import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getRoughEstimate } from "./estimates";

const suffix = crypto.randomUUID();
let userId = "";
let workspaceId = "";
let otherWorkspaceId = "";
let otherUserId = "";
let roomId = "";
let roomWithoutDimsId = "";

const ctx = (): { userId: string; workspaceId: string } => ({ userId, workspaceId });

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Estimate Owner",
      email: `est-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { name: "Est WS", ownerId: user.id, currency: "USD" },
  });
  workspaceId = workspace.id;

  const other = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Other",
      email: `est-other-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  otherUserId = other.id;
  const otherWs = await prisma.workspace.create({
    data: { name: "Other WS", ownerId: other.id },
  });
  otherWorkspaceId = otherWs.id;

  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Est project" },
  });
  const room = await prisma.room.create({
    data: {
      projectId: project.id,
      name: "Est room",
      type: "LIVING_ROOM",
      widthMm: 4000,
      lengthMm: 5000,
      heightMm: 2700,
    },
  });
  roomId = room.id;
  const roomNoDims = await prisma.room.create({
    data: { projectId: project.id, name: "No dims", type: "BEDROOM" },
  });
  roomWithoutDimsId = roomNoDims.id;
});

afterAll(async () => {
  const wsIds = [workspaceId, otherWorkspaceId];
  await prisma.estimateLine.deleteMany({ where: { estimate: { project: { workspaceId: { in: wsIds } } } } });
  await prisma.estimate.deleteMany({ where: { project: { workspaceId: { in: wsIds } } } });
  await prisma.room.deleteMany({ where: { project: { workspaceId: { in: wsIds } } } });
  await prisma.project.deleteMany({ where: { workspaceId: { in: wsIds } } });
  await prisma.rateCardItem.deleteMany({ where: { rateCard: { workspaceId: { in: wsIds } } } });
  await prisma.rateCard.deleteMany({ where: { workspaceId: { in: wsIds } } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: wsIds } } });
  await prisma.workspace.deleteMany({ where: { id: { in: wsIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

describe("getRoughEstimate", () => {
  it("seeds an illustrative rate card once and persists versioned estimates", async () => {
    const first = await getRoughEstimate(prisma, ctx(), roomId);
    expect(first.currency).toBe("USD");
    expect(first.totalMinor).toBeGreaterThan(0);
    expect(first.lowMinor).toBeLessThan(first.highMinor);
    expect(first.usedTypicalSize).toBe(false);

    const second = await getRoughEstimate(prisma, ctx(), roomId);
    expect(second.totalMinor).toBe(first.totalMinor);

    const versions = await prisma.estimate.findMany({
      where: { roomId },
      orderBy: { version: "asc" },
      select: { version: true },
    });
    expect(versions.map((entry) => entry.version)).toEqual([1, 2]);

    const rateCards = await prisma.rateCard.count({
      where: { workspaceId },
    });
    expect(rateCards).toBe(1);
  });

  it("flags rooms without measurements and still returns a range", async () => {
    const estimate = await getRoughEstimate(prisma, ctx(), roomWithoutDimsId);
    expect(estimate.usedTypicalSize).toBe(true);
    expect(estimate.highMinor).toBeGreaterThan(0);
  });

  it("is workspace-scoped", async () => {
    await expect(
      getRoughEstimate(prisma, { userId: otherUserId, workspaceId: otherWorkspaceId }, roomId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
