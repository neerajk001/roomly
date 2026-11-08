import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getEstimateDraft,
  saveStudioEstimate,
  getProjectEstimateSummary,
} from "./studio-estimates";
import { createRateCard, getRateCard, setDefaultRateCard, updateRateCard } from "./rate-cards";
import { parseRateCardCsv } from "../rate-card-csv";

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
  await prisma.proposal.deleteMany({ where: { project: { workspaceId } } });
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

  it("reopens saved lines and preserves sent estimate versions when saving a revision", async () => {
    const saved = await saveStudioEstimate(prisma, ctx(), {
      roomId,
      rateCardId,
      lines: [
        {
          label: "Original",
          category: "paint",
          unit: "AREA_WALL",
          quantity: 10,
          unitPriceMinor: 1000,
        },
      ],
      rangeBps: 2000,
    });
    await prisma.proposal.create({
      data: {
        projectId,
        estimateId: saved.id,
        title: "Sent estimate",
        status: "SENT",
        publicToken: crypto.randomUUID(),
        renderOutputIds: [],
      },
    });
    const opened = await getEstimateDraft(prisma, ctx(), roomId, undefined, saved.id);
    expect(opened.selectedVersion?.sent).toBe(true);
    expect(opened.lines[0]?.label).toBe("Original");
    expect(opened.rangeBps).toBe(2000);
    await saveStudioEstimate(prisma, ctx(), {
      roomId,
      rateCardId,
      lines: [
        {
          label: "Revision",
          category: "paint",
          unit: "AREA_WALL",
          quantity: 20,
          unitPriceMinor: 1000,
        },
      ],
    });
    const original = await getEstimateDraft(prisma, ctx(), roomId, undefined, saved.id);
    expect(original.selectedVersion?.totalMinor).toBe(10000);
    expect(original.lines[0]?.quantity).toBe(10);
    await expect(
      getEstimateDraft(prisma, { userId, workspaceId: "other" }, roomId, undefined, saved.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("summarizes only the latest version per room", async () => {
    const room = await prisma.room.create({ data: { projectId, name: "Second room" } });
    const second = await saveStudioEstimate(prisma, ctx(), {
      roomId: room.id,
      rateCardId,
      lines: [
        {
          label: "Custom",
          category: "custom",
          unit: "LUMP_SUM",
          quantity: 1,
          unitPriceMinor: 5000,
        },
      ],
    });
    const summary = await getProjectEstimateSummary(prisma, ctx(), projectId);
    expect(summary.rooms.find((item) => item.id === room.id)?.estimate?.id).toBe(second.id);
    expect(summary.totals).toEqual([{ currency: "USD", totalMinor: 25000 }]);
    await expect(
      getProjectEstimateSummary(prisma, { userId, workspaceId: "other" }, projectId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates multiple cards, changes the default, and rejects partial invalid imports", async () => {
    const card = await createRateCard(prisma, ctx(), "Premium");
    await setDefaultRateCard(prisma, ctx(), card.id);
    expect((await getRateCard(prisma, ctx(), card.id)).isDefault).toBe(true);
    expect((await getRateCard(prisma, ctx(), rateCardId)).isDefault).toBe(false);
    const before = await getRateCard(prisma, ctx(), card.id);
    await expect(
      updateRateCard(prisma, ctx(), card.id, {
        name: "Invalid import",
        markupBps: 0,
        taxBps: 0,
        items: [
          {
            key: "same",
            label: "First",
            category: "paint",
            unit: "AREA_WALL",
            unitPriceMinor: 100,
          },
          {
            key: "same",
            label: "Duplicate",
            category: "paint",
            unit: "AREA_WALL",
            unitPriceMinor: 200,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(
      (await getRateCard(prisma, ctx(), card.id)).items.map((item) => item.unitPriceMinor),
    ).toEqual(before.items.map((item) => item.unitPriceMinor));
    const items = parseRateCardCsv(
      "key,label,category,unit,price\nwall,Imported,paint,AREA_WALL,1.15",
    );
    await updateRateCard(prisma, ctx(), card.id, {
      name: "Imported",
      markupBps: 0,
      taxBps: 0,
      items,
    });
    expect((await getRateCard(prisma, ctx(), card.id)).items[0]?.unitPriceMinor).toBe(115);
    await expect(
      getRateCard(prisma, { userId, workspaceId: "other" }, card.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      setDefaultRateCard(prisma, { userId, workspaceId: "other" }, card.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
