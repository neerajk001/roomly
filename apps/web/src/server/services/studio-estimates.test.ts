import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEstimateDraft, saveStudioEstimate } from "./studio-estimates";

let userId = "";
let workspaceId = "";
let projectId = "";
let roomId = "";
let rateCardId = "";
const ctx = () => ({ userId, workspaceId });

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Estimate tests",
      email: `${crypto.randomUUID()}@example.test`,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { ownerId: userId, name: "Estimate workspace" },
  });
  workspaceId = workspace.id;
  const project = await prisma.project.create({ data: { workspaceId, name: "Estimate project" } });
  projectId = project.id;
  const room = await prisma.room.create({
    data: {
      projectId,
      name: "Measured room",
      type: "LIVING_ROOM",
      widthMm: 4000,
      lengthMm: 3000,
      heightMm: 2700,
      openings: [
        { type: "DOOR", widthMm: 900, heightMm: 2100, qty: 1 },
        { type: "WINDOW", widthMm: 1500, heightMm: 1200, qty: 1 },
      ],
    },
  });
  roomId = room.id;
  const card = await prisma.rateCard.create({
    data: {
      workspaceId,
      name: "Test rates",
      currency: "USD",
      isDefault: true,
      items: {
        create: [
          {
            key: "wall-paint",
            label: "Paint",
            category: "paint",
            unit: "AREA_WALL",
            unitPriceMinor: 1000,
          },
        ],
      },
    },
  });
  rateCardId = card.id;
});

afterAll(async () => {
  await prisma.estimate.deleteMany({ where: { project: { workspaceId } } });
  await prisma.rateCard.deleteMany({ where: { workspaceId } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("studio estimate correctness", () => {
  it("uses shared-engine deductions for doors and windows", async () => {
    const draft = await getEstimateDraft(prisma, ctx(), roomId);
    expect(draft.lines[0]?.quantity).toBe(34.11);
    expect(draft.lines[0]?.unitPriceMinor).toBe(1000);
  });
  it("does not create zero-dimension estimates from unmeasured rooms", async () => {
    const room = await prisma.room.create({
      data: { projectId, name: "Unmeasured", type: "LIVING_ROOM" },
    });
    await expect(getEstimateDraft(prisma, ctx(), room.id)).rejects.toMatchObject({
      code: "MEASUREMENTS_REQUIRED",
    });
  });
  it("allocates distinct sequential versions for concurrent saves", async () => {
    const input = {
      roomId,
      rateCardId,
      lines: [
        {
          label: "Paint",
          category: "paint",
          unit: "AREA_WALL" as const,
          quantity: 34.11,
          unitPriceMinor: 1000,
        },
      ],
    };
    const saves = await Promise.all([
      saveStudioEstimate(prisma, ctx(), input),
      saveStudioEstimate(prisma, ctx(), input),
    ]);
    expect(saves.map((saved) => saved.version).sort()).toEqual([1, 2]);
    expect(saves.map((saved) => saved.totalMinor)).toEqual([34110, 34110]);
  });
  it("rejects cross-workspace reads and writes", async () => {
    const other = { userId, workspaceId: "unrelated" };
    await expect(getEstimateDraft(prisma, other, roomId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      saveStudioEstimate(prisma, other, { roomId, rateCardId, lines: [] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rejects totals that cannot fit integer database money fields", async () => {
    await expect(
      saveStudioEstimate(prisma, ctx(), {
        roomId,
        rateCardId,
        lines: [
          {
            label: "Huge",
            category: "custom",
            unit: "PER_UNIT",
            quantity: 100000,
            unitPriceMinor: 1000000000,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
