import sharp from "sharp";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { prisma } from "@roomdesigner/db";
import { createDemoRoomAssessmentProvider, type RoomAssessmentProvider } from "@roomdesigner/ai";
import { assessRoomBeforeGeneration } from "./room-assessment";
let workspaceId = "",
  userId = "",
  roomId = "",
  assetId = "",
  jobId = "";
let image: Buffer;
const context = {
  roomType: "LIVING_ROOM",
  dimensionsMm: { width: null, length: null, height: null },
  requestedItems: [{ key: "sofa", label: "Sofa" }],
  keepList: [],
  renterMode: false,
  notes: "",
};
beforeAll(async () => {
  image = await sharp({ create: { width: 100, height: 80, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Assessment test",
      email: `assess-${crypto.randomUUID()}@example.test`,
      emailVerified: true,
    },
  });
  userId = user.id;
  const ws = await prisma.workspace.create({ data: { name: "Assessment", ownerId: userId } });
  workspaceId = ws.id;
  const project = await prisma.project.create({ data: { workspaceId, name: "Room" } });
  const room = await prisma.room.create({
    data: { projectId: project.id, name: "Room", type: "LIVING_ROOM" },
  });
  roomId = room.id;
  const asset = await prisma.asset.create({
    data: {
      workspaceId,
      roomId,
      kind: "ORIGINAL_PHOTO",
      mime: "image/png",
      sizeBytes: image.length,
      storageKey: `test/assess/${workspaceId}.png`,
      confirmedAt: new Date(),
    },
  });
  assetId = asset.id;
  const job = await prisma.renderJob.create({
    data: {
      workspaceId,
      roomId,
      sourceAssetId: assetId,
      kind: "RESTYLE",
      status: "RUNNING",
      provider: "fake",
      variations: 1,
      creditsCharged: 1,
      params: { providerQuality: "low", size: "1024x1024" },
    },
  });
  jobId = job.id;
});
afterAll(async () => {
  await prisma.renderJob.deleteMany({ where: { workspaceId } });
  await prisma.asset.deleteMany({ where: { workspaceId } });
  await prisma.room.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});
async function reset() {
  await prisma.renderJob.update({
    where: { id: jobId, workspaceId },
    data: { params: { providerQuality: "low", size: "1024x1024" } },
  });
}
const input = () => ({
  jobId,
  workspaceId,
  sourceAssetId: assetId,
  image,
  context,
  imageProviderName: "fake",
  dailyLimitMicros: 1_000_000_000,
  callBudgetMicros: 100,
});
async function provider(): Promise<RoomAssessmentProvider & { assess: ReturnType<typeof vi.fn> }> {
  const content = await createDemoRoomAssessmentProvider().assess({
    image,
    mime: "image/png",
    context,
  });
  return { source: "ai", model: "mock-vision", assess: vi.fn(async () => content) };
}
it("scopes job/source access before invoking a provider", async () => {
  await reset();
  const p = await provider();
  for (const invalid of [{ workspaceId: "other" }, { sourceAssetId: "other" }])
    await expect(
      assessRoomBeforeGeneration(prisma, { ...input(), ...invalid, provider: p }),
    ).rejects.toMatchObject({ code: "INVALID_JOB" });
  expect(p.assess).not.toHaveBeenCalled();
});
it("caches exact context on retries, preserves spend and rejects stale reuse", async () => {
  await reset();
  const p = await provider();
  const first = await assessRoomBeforeGeneration(prisma, { ...input(), provider: p });
  expect(await assessRoomBeforeGeneration(prisma, { ...input(), provider: p })).toEqual(first);
  expect(p.assess).toHaveBeenCalledTimes(1);
  await expect(
    assessRoomBeforeGeneration(prisma, {
      ...input(),
      provider: p,
      imageBudgetMicros: 100,
      dailyLimitMicros: 1,
    }),
  ).rejects.toMatchObject({ code: "ASSESSMENT_PAUSED" });
  await expect(
    assessRoomBeforeGeneration(prisma, {
      ...input(),
      provider: p,
      context: { ...context, notes: "Changed" },
    }),
  ).rejects.toMatchObject({ code: "ASSESSMENT_INTERRUPTED" });
  const job = await prisma.renderJob.findFirstOrThrow({ where: { id: jobId, workspaceId } });
  expect(job.params).toMatchObject({
    adviceSpendByDay: { [new Date().toISOString().slice(0, 10)]: 100 },
  });
});
it("prevents simultaneous duplicate calls and never retries a failed assessment", async () => {
  await reset();
  const p = await provider();
  const results = await Promise.allSettled(
    [1, 2].map(() => assessRoomBeforeGeneration(prisma, { ...input(), provider: p })),
  );
  expect(results.some((result) => result.status === "fulfilled")).toBe(true);
  expect(p.assess).toHaveBeenCalledTimes(1);
  await reset();
  p.assess.mockRejectedValue(new Error("private provider detail"));
  await expect(
    assessRoomBeforeGeneration(prisma, { ...input(), provider: p }),
  ).rejects.toMatchObject({ code: "ASSESSMENT_FAILED" });
  await expect(
    assessRoomBeforeGeneration(prisma, { ...input(), provider: p }),
  ).rejects.toMatchObject({ code: "ASSESSMENT_INTERRUPTED" });
  expect(p.assess).toHaveBeenCalledTimes(2);
});
it("guards paid headroom including image allowance and refuses demo checks for a real image provider", async () => {
  await reset();
  const p = await provider();
  await expect(
    assessRoomBeforeGeneration(prisma, {
      ...input(),
      provider: p,
      dailyLimitMicros: 100,
      imageBudgetMicros: 100,
    }),
  ).rejects.toMatchObject({ code: "ASSESSMENT_PAUSED" });
  expect(p.assess).not.toHaveBeenCalled();
  await expect(
    assessRoomBeforeGeneration(prisma, {
      ...input(),
      provider: createDemoRoomAssessmentProvider(),
      imageProviderName: "openai",
    }),
  ).rejects.toMatchObject({ code: "ASSESSMENT_UNAVAILABLE" });
});
