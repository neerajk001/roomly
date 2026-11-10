import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dailyAiSpendMicros, prisma } from "@roomdesigner/db";
import type { ConceptAdviceProvider } from "@roomdesigner/ai";
import { getConceptAdvice } from "./concept-advice";
import { createRender } from "./renders";

// These service tests inspect jobs; actual queue delivery is covered by Playwright.
vi.mock("../queue", () => ({ enqueueRender: vi.fn(async () => undefined) }));

let userId = "";
let workspaceId = "";
let roomId = "";
let jobId = "";
let image: Buffer;
const outputIds: string[] = [];
const assetIds: string[] = [];
const ctx = () => ({ userId, workspaceId, emailVerified: true });
const content = {
  objects: [{ label: "Portable lamp", region: { left: 100, top: 200, right: 400, bottom: 700 } }],
  summary: "A considered room.",
  suggestions: [
    {
      title: "Portable lighting",
      observation: "A visible reading area could use softer light.",
      reason: "A portable lamp can soften the contrast.",
      instruction: "Add one softly shaded portable lamp and keep everything else unchanged.",
    },
  ],
};
const provider = (source: "demo" | "ai" = "demo") =>
  ({ source, suggest: vi.fn(async () => content) }) satisfies ConceptAdviceProvider;
const input = (index = 0) => ({ roomId, outputId: outputIds[index] });

beforeAll(async () => {
  image = await readFile(new URL("../../../../../tests/e2e/fixtures/room.jpg", import.meta.url));
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Advice Test",
      email: `advice-${crypto.randomUUID()}@example.test`,
      emailVerified: true,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { ownerId: userId, name: "Advice workspace" },
  });
  workspaceId = workspace.id;
  const project = await prisma.project.create({
    data: { workspaceId, name: "Advice project", keepList: ["Sofa"], renterMode: true },
  });
  const room = await prisma.room.create({
    data: { projectId: project.id, name: "Living", type: "LIVING_ROOM" },
  });
  roomId = room.id;
  const asset = await prisma.asset.create({
    data: {
      workspaceId,
      roomId,
      kind: "ORIGINAL_PHOTO",
      mime: "image/jpeg",
      sizeBytes: image.length,
      storageKey: `test/advice/${workspaceId}/source.jpg`,
      confirmedAt: new Date(),
    },
  });
  const job = await prisma.renderJob.create({
    data: {
      workspaceId,
      roomId,
      kind: "RESTYLE",
      styleKey: "modern",
      status: "SUCCEEDED",
      sourceAssetId: asset.id,
      variations: 2,
      provider: "fake",
      creditsCharged: 2,
      createdAt: new Date(Date.now() - 86_400_000),
      params: {
        providerQuality: "low",
        size: "1024x1024",
        conceptPlanVersion: 1,
        styleKeys: ["modern", "indian-minimal"],
        traditionKey: "global",
        notes: "Leave a reading corner",
        budgetTier: "budget",
        includeItems: ["sofa", "floor-lamp"],
      },
    },
  });
  jobId = job.id;
  for (let index = 0; index < 2; index++) {
    const render = await prisma.asset.create({
      data: {
        workspaceId,
        roomId,
        kind: "RENDER",
        mime: "image/jpeg",
        sizeBytes: image.length,
        storageKey: `test/advice/${workspaceId}/concept-${index}.jpg`,
        confirmedAt: new Date(),
      },
    });
    const output = await prisma.renderOutput.create({ data: { jobId, assetId: render.id, index } });
    outputIds.push(output.id);
    assetIds.push(render.id);
  }
  await prisma.creditLedger.create({
    data: { workspaceId, delta: 12, reason: "ADJUSTMENT", refId: `advice-test-${jobId}` },
  });
});
afterAll(async () => {
  await prisma.renderOutput.deleteMany({ where: { job: { workspaceId } } });
  await prisma.renderJob.deleteMany({ where: { workspaceId } });
  await prisma.creditLedger.deleteMany({ where: { workspaceId } });
  await prisma.asset.deleteMany({ where: { workspaceId } });
  await prisma.room.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

async function clearAdvice() {
  const job = await prisma.renderJob.findFirstOrThrow({ where: { id: jobId, workspaceId } });
  const data = job.params;
  if (typeof data !== "object" || data === null || Array.isArray(data))
    throw new Error("Invalid fixture metadata");
  await prisma.renderJob.update({
    where: { id: jobId, workspaceId },
    data: { params: { ...data, conceptAdvice: {}, adviceSpendByDay: {} } },
  });
}

describe("image-specific advice service", () => {
  it("authorizes the room/output before downloading any image", async () => {
    const selected = provider();
    const download = vi.fn(async () => image);
    for (const [context, request] of [
      [{ ...ctx(), workspaceId: "another-workspace" }, input()],
      [ctx(), { ...input(), roomId: "another-room" }],
    ] as const) {
      await expect(
        getConceptAdvice(prisma, context, request, { provider: selected, download }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect(download).not.toHaveBeenCalled();
    expect(selected.suggest).not.toHaveBeenCalled();
  });
  it("targets concept two, preserves its context and reuses cached advice without another call", async () => {
    await clearAdvice();
    const selected = provider();
    const download = vi.fn(async () => image);
    const first = await getConceptAdvice(prisma, ctx(), input(1), { provider: selected, download });
    expect(
      await getConceptAdvice(prisma, ctx(), input(1), { provider: selected, download }),
    ).toEqual(first);
    expect(selected.suggest).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(`test/advice/${workspaceId}/concept-1.jpg`);
    expect(selected.suggest).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          style: "Indian minimal",
          direction: "Warm & tactile",
          keepList: ["Sofa"],
          renterMode: true,
          notes: "Leave a reading corner",
          budgetTier: "budget",
        }),
      }),
    );
    const balance = await prisma.creditLedger.aggregate({
      where: { workspaceId },
      _sum: { delta: true },
    });
    expect(balance._sum.delta).toBe(12);
  });
  it("does not duplicate a provider request under simultaneous clicks", async () => {
    await clearAdvice();
    const selected = provider();
    const outcomes = await Promise.allSettled(
      [1, 2].map(() =>
        getConceptAdvice(prisma, ctx(), input(), {
          provider: selected,
          download: async () => image,
        }),
      ),
    );
    expect(selected.suggest).toHaveBeenCalledTimes(1);
    expect(outcomes.some((outcome) => outcome.status === "fulfilled")).toBe(true);
  });
  it("analyses full room plus separate crops without instructions, caches each selection and reserves crop spend", async () => {
    await clearAdvice();
    const selected = provider("ai");
    const download = vi.fn(async () => image);
    const editTarget = {
      label: "Selected areas",
      region: { left: 100, top: 200, right: 400, bottom: 700 },
      additionalRegions: [{ left: 700, top: 100, right: 900, bottom: 300 }],
    };
    const deps = {
      provider: selected,
      download,
      callBudgetMicros: 100,
      dailyLimitMicros: 1_000_000_000,
    };
    const request = { ...input(), editTarget };
    const before = await prisma.renderJob.count({ where: { workspaceId } });
    const first = await getConceptAdvice(prisma, ctx(), request, deps);
    expect(await getConceptAdvice(prisma, ctx(), request, deps)).toEqual(first);
    expect(selected.suggest).toHaveBeenCalledTimes(1);
    expect(selected.suggest).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedImages: expect.arrayContaining([
          expect.objectContaining({ image: expect.any(Buffer) }),
        ]),
        context: expect.objectContaining({
          selectedRegions: [editTarget.region, ...editTarget.additionalRegions],
          intentionHint: "",
        }),
      }),
    );
    await getConceptAdvice(prisma, ctx(), { ...request, intentionHint: "Maybe more colour" }, deps);
    await getConceptAdvice(
      prisma,
      ctx(),
      { ...request, editTarget: { ...editTarget, region: { ...editTarget.region, left: 150 } } },
      deps,
    );
    await getConceptAdvice(prisma, ctx(), input(), deps);
    expect(selected.suggest).toHaveBeenCalledTimes(4);
    expect(await prisma.renderJob.count({ where: { workspaceId } })).toBe(before);
    const job = await prisma.renderJob.findFirstOrThrow({ where: { id: jobId, workspaceId } });
    expect(job.params).toMatchObject({
      adviceSpendByDay: { [new Date().toISOString().slice(0, 10)]: 1000 },
    });
  });
  it("bounds selected-analysis variants and authorizes selected requests before accessing images", async () => {
    await clearAdvice();
    const selected = provider();
    const download = vi.fn(async () => image);
    const editTarget = { label: "Area", region: { left: 100, top: 200, right: 400, bottom: 700 } };
    const deps = { provider: selected, download };
    await expect(
      getConceptAdvice(
        prisma,
        { ...ctx(), workspaceId: "another-workspace" },
        { ...input(), editTarget },
        deps,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(download).not.toHaveBeenCalled();
    for (let i = 0; i < 6; i++)
      await getConceptAdvice(
        prisma,
        ctx(),
        { ...input(), editTarget, intentionHint: "Idea " + i },
        deps,
      );
    await expect(
      getConceptAdvice(
        prisma,
        ctx(),
        { ...input(), editTarget, intentionHint: "Another idea" },
        deps,
      ),
    ).rejects.toMatchObject({ code: "ADVICE_LIMIT" });
    expect(selected.suggest).toHaveBeenCalledTimes(6);
  });
  it("counts paid advice on an older job against today's guard and caps failed attempts", async () => {
    await clearAdvice();
    const selected = provider("ai");
    selected.suggest.mockRejectedValue(new Error("private provider detail"));
    const deps = {
      provider: selected,
      download: async () => image,
      callBudgetMicros: 100,
      dailyLimitMicros: 1_000_000_000,
    };
    for (let index = 0; index < 2; index++)
      await expect(getConceptAdvice(prisma, ctx(), input(), deps)).rejects.toMatchObject({
        code: "ADVICE_FAILED",
      });
    await expect(getConceptAdvice(prisma, ctx(), input(), deps)).rejects.toMatchObject({
      code: "ADVICE_LIMIT",
    });
    expect(selected.suggest).toHaveBeenCalledTimes(2);
    const job = await prisma.renderJob.findFirstOrThrow({ where: { id: jobId, workspaceId } });
    expect(job.params).toMatchObject({
      adviceSpendByDay: { [new Date().toISOString().slice(0, 10)]: 200 },
      notes: "Leave a reading corner",
      includeItems: ["sofa", "floor-lamp"],
    });
    expect(await dailyAiSpendMicros(prisma)).toBeGreaterThanOrEqual(200);
  });
  it("blocks a paid call before invoking the provider when headroom is unavailable", async () => {
    await clearAdvice();
    const selected = provider("ai");
    await expect(
      getConceptAdvice(prisma, ctx(), input(), {
        provider: selected,
        download: async () => image,
        callBudgetMicros: 100,
        dailyLimitMicros: 1,
      }),
    ).rejects.toMatchObject({ code: "SERVICE_BUSY" });
    expect(selected.suggest).not.toHaveBeenCalled();
  });
  it("edits the selected output asset and inherits the selected style and room direction", async () => {
    const editTarget = {
      label: "Portable lamp",
      region: { left: 100, top: 200, right: 400, bottom: 700 },
      additionalRegions: [{ left: 700, top: 100, right: 900, bottom: 300 }],
    };
    const created = await createRender(prisma, ctx(), {
      roomId,
      kind: "EDIT",
      sourceOutputId: outputIds[1],
      instruction: "Add a portable reading lamp",
      editTarget,
      quality: "final",
      variations: 1,
    });
    const edit = await prisma.renderJob.findFirstOrThrow({
      where: { id: created.jobId, workspaceId },
    });
    expect(edit.sourceAssetId).toBe(assetIds[1]);
    expect(edit.parentJobId).toBe(jobId);
    expect(edit.styleKey).toBe("indian-minimal");
    expect(edit.params).toMatchObject({
      sourceOutputId: outputIds[1],
      sourceDirectionLabel: "Warm & tactile",
      includeItems: ["sofa", "floor-lamp"],
      editTarget,
      budgetTier: "budget",
      notes: "Leave a reading corner",
    });
  });
  it("rejects another workspace's target image without charging credits", async () => {
    const ledgerBefore = await prisma.creditLedger.count({ where: { workspaceId } });
    await expect(
      createRender(
        prisma,
        { ...ctx(), workspaceId: "another-workspace" },
        {
          roomId,
          kind: "EDIT",
          sourceOutputId: outputIds[1],
          instruction: "Change only this area",
          quality: "final",
          variations: 1,
          editTarget: { label: "Sofa", region: { left: 100, top: 200, right: 600, bottom: 700 } },
        },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.creditLedger.count({ where: { workspaceId } })).toBe(ledgerBefore);
  });
  it("rejects cross-room must-haves before reserving credits", async () => {
    const before = await prisma.creditLedger.count({ where: { workspaceId } });
    await expect(
      createRender(prisma, ctx(), {
        roomId,
        kind: "RESTYLE",
        styleKey: "modern",
        variations: 3,
        quality: "draft",
        includeItems: ["counter-organizers"],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(await prisma.creditLedger.count({ where: { workspaceId } })).toBe(before);
  });
});
