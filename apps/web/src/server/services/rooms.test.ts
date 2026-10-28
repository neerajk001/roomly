import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRoom } from "./rooms";

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
  await prisma.room.deleteMany({ where: { project: { workspaceId } } });
  await prisma.project.deleteMany({ where: { workspaceId } });
  await prisma.workspace.deleteMany({ where: { id: workspaceId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

const ctx = (): { userId: string; workspaceId: string } => ({ userId, workspaceId });

describe("createRoom", () => {
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
});
