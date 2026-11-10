import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createRoom, getRoom, updateRoom, removeRoomPhoto } from "./rooms";
import { createDesignProject } from "./design-projects";
import { getProject } from "./projects";
import { createRender } from "./renders";
import { listRoomRenderJobs } from "./render-history";
import { submitBrief } from "./briefs";

vi.mock("../queue", () => ({ enqueueRender: vi.fn().mockResolvedValue(undefined) }));

const suffix = crypto.randomUUID();
let userId = "";
let workspaceId = "";
let projectId = "";

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Rooms Test",
      email: `rooms-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { name: "Rooms WS", ownerId: user.id },
  });
  workspaceId = workspace.id;
  const project = await prisma.project.create({
    data: { workspaceId: workspace.id, name: "Rooms project" },
  });
  projectId = project.id;
});

afterAll(async () => {
  await prisma.briefLink.deleteMany({ where: { workspaceId } });
  await prisma.renderJob.deleteMany({ where: { workspaceId } });
  await prisma.creditLedger.deleteMany({ where: { workspaceId } });
  await prisma.asset.deleteMany({ where: { workspaceId } });
  await prisma.room.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

const ctx = (): { userId: string; workspaceId: string } => ({ userId, workspaceId });

describe("createRoom", () => {
  it("creates a named project and first room together, and rejects another workspace's client", async () => {
    const client = await prisma.client.create({ data: { workspaceId, name: "Quick client" } });
    try {
      const input = {
        name: "Kitchen project",
        clientId: client.id,
        roomType: "KITCHEN" as const,
        renterMode: false,
        keepList: [],
      };
      const created = await createDesignProject(prisma, { ...ctx(), currency: "INR" }, input);
      const project = await prisma.project.findFirstOrThrow({
        where: { id: created.projectId, workspaceId },
        include: { rooms: true },
      });
      expect(project.clientId).toBe(client.id);
      expect(project.rooms).toHaveLength(1);
      expect(project.rooms[0]).toMatchObject({
        id: created.roomId,
        type: "KITCHEN",
        widthMm: null,
      });
      await expect(
        createDesignProject(
          prisma,
          { ...ctx(), workspaceId: "another-workspace", currency: "INR" },
          input,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await prisma.project.updateMany({
        where: { workspaceId, clientId: client.id },
        data: { clientId: null },
      });
      await prisma.client.deleteMany({ where: { id: client.id, workspaceId } });
    }
  });
  it("uses confirmed brief photos in projects, rooms and render generation", async () => {
    const link = await prisma.briefLink.create({
      data: { workspaceId, token: crypto.randomUUID() },
    });
    const photo = await prisma.asset.create({
      data: {
        workspaceId,
        kind: "BRIEF_UPLOAD",
        storageKey: `test/${suffix}/brief.jpg`,
        mime: "image/jpeg",
        sizeBytes: 20,
        confirmedAt: new Date(),
      },
    });
    const result = await submitBrief(
      prisma,
      link.token,
      { roomType: "BEDROOM", clientName: "Test client" },
      [photo.id],
    );
    const room = await getRoom(prisma, ctx(), result.roomId);
    expect(room.photos.map((item) => item.id)).toContain(photo.id);
    const project = await getProject(prisma, ctx(), result.projectId);
    expect(project.rooms[0]?.photos.map((item) => item.id)).toContain(photo.id);
    await prisma.creditLedger.create({
      data: { workspaceId, delta: 2, reason: "ADJUSTMENT", refId: crypto.randomUUID() },
    });
    const render = await createRender(
      prisma,
      { ...ctx(), emailVerified: true },
      {
        roomId: result.roomId,
        kind: "RESTYLE",
        styleKey: "modern",
        variations: 1,
        quality: "draft",
      },
    );
    const stored = await prisma.renderJob.findFirstOrThrow({
      where: { id: render.jobId, workspaceId },
    });
    expect(stored.sourceAssetId).toBe(photo.id);
    await expect(
      removeRoomPhoto(prisma, { userId, workspaceId: "unrelated" }, photo.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeRoomPhoto(prisma, ctx(), photo.id);
    expect((await getRoom(prisma, ctx(), result.roomId)).photos).toEqual([]);
    expect(
      await prisma.renderJob.count({
        where: { id: render.jobId, workspaceId, sourceAssetId: photo.id },
      }),
    ).toBe(1);
  });

  it("allows only one project from simultaneous brief submissions", async () => {
    const link = await prisma.briefLink.create({
      data: { workspaceId, token: crypto.randomUUID() },
    });
    const results = await Promise.allSettled([
      submitBrief(prisma, link.token, { roomType: "BEDROOM", clientName: "Client" }, []),
      submitBrief(prisma, link.token, { roomType: "BEDROOM", clientName: "Client" }, []),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(
      await prisma.briefSubmission.count({
        where: { briefLinkId: link.id, briefLink: { workspaceId } },
      }),
    ).toBe(1);
  });

  it("retains more than ten renders in order and isolates room history", async () => {
    const room = await createRoom(prisma, ctx(), projectId, {
      name: "History",
      type: "OTHER",
      openings: [],
    });
    const photo = await prisma.asset.create({
      data: {
        workspaceId,
        roomId: room.id,
        kind: "ORIGINAL_PHOTO",
        storageKey: `test/${suffix}/history.jpg`,
        mime: "image/jpeg",
        sizeBytes: 20,
      },
    });
    const start = Date.now();
    await prisma.renderJob.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        workspaceId,
        roomId: room.id,
        kind: "RESTYLE" as const,
        status: "SUCCEEDED" as const,
        sourceAssetId: photo.id,
        provider: "fake",
        variations: 1,
        creditsCharged: 0,
        createdAt: new Date(start + index * 1000),
      })),
    });
    const history = await listRoomRenderJobs(prisma, ctx(), room.id);
    expect(history).toHaveLength(12);
    expect(history.at(-1)?.createdAt.getTime()).toBe(start + 11000);
    expect(
      await listRoomRenderJobs(prisma, { userId, workspaceId: "unrelated-workspace" }, room.id),
    ).toEqual([]);
  });

  it("creates a room without measurements (homeowners often skip them)", async () => {
    const room = await createRoom(prisma, ctx(), projectId, {
      name: "Unmeasured room",
      type: "LIVING_ROOM",
      openings: [],
    });
    expect(room.widthMm).toBeNull();
    expect(room.lengthMm).toBeNull();
    expect(room.heightMm).toBeNull();
  });

  it("stores provided measurements in millimetres", async () => {
    const room = await createRoom(prisma, ctx(), projectId, {
      name: "Measured room",
      type: "BEDROOM",
      widthMm: 4200,
      lengthMm: 5300,
      heightMm: 2700,
      openings: [{ type: "WINDOW", widthMm: 1200, heightMm: 1400, qty: 2 }],
    });
    expect(room.widthMm).toBe(4200);
    expect(room.lengthMm).toBe(5300);
    expect(room.heightMm).toBe(2700);
  });

  it("rejects out-of-range measurements", async () => {
    await expect(
      createRoom(prisma, ctx(), projectId, {
        name: "Tiny room",
        type: "OTHER",
        widthMm: 100,
        lengthMm: 5000,
        heightMm: 2700,
        openings: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("updates room details, clears optional sizes and validates service input", async () => {
    const room = await createRoom(prisma, ctx(), projectId, {
      name: "Before",
      type: "BEDROOM",
      widthMm: 4000,
      openings: [],
    });
    const updated = await updateRoom(prisma, ctx(), room.id, {
      name: "After",
      type: "HOME_OFFICE",
      openings: [],
    });
    expect(updated.name).toBe("After");
    expect(updated.widthMm).toBeNull();
    await expect(
      updateRoom(prisma, ctx(), room.id, {
        name: "Invalid",
        type: "BEDROOM",
        widthMm: 10,
        openings: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
