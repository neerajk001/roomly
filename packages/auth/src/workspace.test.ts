import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "./workspace";

const email = `bootstrap-${crypto.randomUUID()}@example.test`;
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: "Bootstrap Tester",
      email,
      emailVerified: true,
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.creditLedger.deleteMany({ where: { workspace: { ownerId: userId } } });
  await prisma.workspaceMember.deleteMany({ where: { userId } });
  await prisma.workspace.deleteMany({ where: { ownerId: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("bootstrapWorkspace", () => {
  it("creates the personal workspace, OWNER membership and one signup grant", async () => {
    await bootstrapWorkspace({ id: userId, name: "Bootstrap Tester" });

    const workspaces = await prisma.workspace.findMany({ where: { ownerId: userId } });
    expect(workspaces).toHaveLength(1);
    const workspace = workspaces[0];
    expect(workspace?.type).toBe("PERSONAL");
    expect(workspace?.name).toBe("Bootstrap's space");

    const members = await prisma.workspaceMember.findMany({ where: { userId } });
    expect(members).toHaveLength(1);
    expect(members[0]?.role).toBe("OWNER");

    const ledger = await prisma.creditLedger.findMany({
      where: { workspaceId: workspace?.id },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.reason).toBe("SIGNUP_GRANT");
    expect(ledger[0]?.delta).toBe(getServerEnv().SIGNUP_FREE_CREDITS);
    expect(ledger[0]?.refId).toBe(workspace?.id);
  });

  it("is idempotent: a second run changes nothing", async () => {
    await bootstrapWorkspace({ id: userId, name: "Bootstrap Tester" });
    await bootstrapWorkspace({ id: userId, name: "Bootstrap Tester" });

    expect(await prisma.workspace.count({ where: { ownerId: userId } })).toBe(1);
    expect(await prisma.workspaceMember.count({ where: { userId } })).toBe(1);
    const ledger = await prisma.creditLedger.findMany({
      where: { workspace: { ownerId: userId } },
    });
    expect(ledger).toHaveLength(1);
  });
});
