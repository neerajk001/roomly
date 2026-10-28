import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./index";

/**
 * Tenant isolation scaffold (required by 02-database.md). V1 has no services
 * yet, so this proves the pattern every V2+ service must follow: queries are
 * scoped by workspaceId and cross-workspace ids behave like missing records.
 * Extend this file as services land in V2, V3 and V4.
 */
const suffix = crypto.randomUUID();
const userIds: string[] = [];
let workspaceA = "";
let workspaceB = "";
let projectA = "";

beforeAll(async () => {
  const ownerA = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Owner A",
      email: `iso-a-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  const ownerB = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Owner B",
      email: `iso-b-${suffix}@example.test`,
      emailVerified: true,
    },
  });
  userIds.push(ownerA.id, ownerB.id);

  const a = await prisma.workspace.create({
    data: { name: "Workspace A", ownerId: ownerA.id },
  });
  const b = await prisma.workspace.create({
    data: { name: "Workspace B", ownerId: ownerB.id },
  });
  workspaceA = a.id;
  workspaceB = b.id;

  const project = await prisma.project.create({
    data: { workspaceId: workspaceA, name: "Secret project A" },
  });
  projectA = project.id;

  await prisma.project.create({ data: { workspaceId: workspaceB, name: "Project B" } });
});

afterAll(async () => {
  await prisma.project.deleteMany({ where: { workspaceId: { in: [workspaceA, workspaceB] } } });
  await prisma.workspace.deleteMany({ where: { id: { in: [workspaceA, workspaceB] } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("tenant isolation", () => {
  it("scoped reads do not return records from another workspace", async () => {
    const fromB = await prisma.project.findFirst({
      where: { id: projectA, workspaceId: workspaceB },
    });
    expect(fromB).toBeNull();

    const fromA = await prisma.project.findFirst({
      where: { id: projectA, workspaceId: workspaceA },
    });
    expect(fromA?.name).toBe("Secret project A");
  });

  it("scoped writes cannot touch another workspace", async () => {
    const updated = await prisma.project.updateMany({
      where: { id: projectA, workspaceId: workspaceB },
      data: { name: "Hijacked" },
    });
    expect(updated.count).toBe(0);
  });

  it("scoped deletes cannot touch another workspace", async () => {
    const deleted = await prisma.project.deleteMany({
      where: { id: projectA, workspaceId: workspaceB },
    });
    expect(deleted.count).toBe(0);
    expect(await prisma.project.count({ where: { id: projectA } })).toBe(1);
  });
});
