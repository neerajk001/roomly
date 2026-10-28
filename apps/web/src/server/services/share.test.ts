import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { castVote, createShareLink, getSharedGallery, revokeShareLink } from "./share";

const suffix = crypto.randomUUID();
let userId = "";
let workspaceId = "";
let projectId = "";
let outputId = "";
let token = "";

const ctx = (): { userId: string; workspaceId: string } => ({ userId, workspaceId });
const sign = async (key: string): Promise<string> => `signed:${key}`;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Share Owner",
      email: `share-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { name: "Share WS", ownerId: user.id },
  });
  workspaceId = workspace.id;
  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Share project" },
  });
  projectId = project.id;
  const room = await prisma.room.create({
    data: { projectId: project.id, name: "Share room", type: "LIVING_ROOM", widthMm: 4000, lengthMm: 5000, heightMm: 2700 },
  });
  const sourceAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "ORIGINAL_PHOTO",
      storageKey: `test/${suffix}/source.jpg`,
      mime: "image/jpeg",
      sizeBytes: 10,
      confirmedAt: new Date(),
    },
  });
  const renderAsset = await prisma.asset.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "RENDER",
      storageKey: `test/${suffix}/render.jpg`,
      mime: "image/jpeg",
      sizeBytes: 10,
      confirmedAt: new Date(),
    },
  });
  const job = await prisma.renderJob.create({
    data: {
      workspaceId: workspace.id,
      roomId: room.id,
      kind: "RESTYLE",
      status: "SUCCEEDED",
      params: { providerQuality: "low", size: "1024x1024" },
      sourceAssetId: sourceAsset.id,
      variations: 1,
      provider: "fake",
      creditsCharged: 1,
    },
  });
  const output = await prisma.renderOutput.create({
    data: { jobId: job.id, assetId: renderAsset.id, index: 0, isFavorite: true },
  });
  outputId = output.id;
});

afterAll(async () => {
  await prisma.renderOutput.deleteMany({ where: { job: { workspaceId } } });
  await prisma.renderJob.deleteMany({ where: { workspaceId } });
  await prisma.asset.deleteMany({ where: { workspaceId } });
  await prisma.room.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("share links", () => {
  it("creates a token, keeps it on update, and regenerates on request", async () => {
    const created = await createShareLink(prisma, ctx(), projectId, { onlyFavorites: true });
    token = created.token;
    expect(token.length).toBeGreaterThanOrEqual(32);

    const kept = await createShareLink(prisma, ctx(), projectId, { onlyFavorites: false });
    expect(kept.token).toBe(token);
    expect(kept.onlyFavorites).toBe(false);

    const regenerated = await createShareLink(prisma, ctx(), projectId, {
      onlyFavorites: true,
      regenerate: true,
    });
    expect(regenerated.token).not.toBe(token);
    token = regenerated.token;
  });

  it("returns only favorited outputs when configured", async () => {
    await createShareLink(prisma, ctx(), projectId, { onlyFavorites: true });
    const gallery = await getSharedGallery(prisma, token, sign);
    expect(gallery.outputs).toHaveLength(1);
    expect(gallery.beforeUrl?.startsWith("signed:")).toBe(true);

    await createShareLink(prisma, ctx(), projectId, { onlyFavorites: false });
    const all = await getSharedGallery(prisma, token, sign);
    expect(all.outputs).toHaveLength(1);
  });

  it("counts a vote once per call and ignores unknown tokens", async () => {
    const first = await castVote(prisma, token, outputId);
    expect(first?.votes).toBe(1);
    const second = await castVote(prisma, token, outputId);
    expect(second?.votes).toBe(2);

    expect(await castVote(prisma, "not-a-token", outputId)).toBeNull();
    await expect(getSharedGallery(prisma, "not-a-token", sign)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("revoked tokens stop working", async () => {
    await revokeShareLink(prisma, ctx(), projectId);
    await expect(getSharedGallery(prisma, token, sign)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await castVote(prisma, token, outputId)).toBeNull();
  });
});
