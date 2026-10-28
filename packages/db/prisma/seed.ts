import { prisma } from "../src/index.js";
import { getServerEnv } from "@roomdesigner/config/env";

const DEMO_EMAIL = "demo@roomdesigner.local";

async function seedDemo(): Promise<void> {
  const env = getServerEnv();

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      id: "demo-user",
      name: "Demo Designer",
      email: DEMO_EMAIL,
      emailVerified: true,
      mode: "PRO",
    },
  });

  const existing = await prisma.workspace.findFirst({
    where: { ownerId: user.id },
    select: { id: true },
  });

  if (existing !== null) {
    process.stdout.write(`Demo data already present (workspace ${existing.id}).\n`);
    return;
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const created = await tx.workspace.create({
      data: {
        name: "Demo Studio",
        type: "STUDIO",
        ownerId: user.id,
      },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: created.id, userId: user.id, role: "OWNER" },
    });
    await tx.creditLedger.create({
      data: {
        workspaceId: created.id,
        delta: env.SIGNUP_FREE_CREDITS,
        reason: "SIGNUP_GRANT",
        refId: created.id,
        note: "Demo signup credits",
      },
    });
    await tx.client.create({
      data: {
        workspaceId: created.id,
        name: "Sample Client",
        email: "client@example.com",
      },
    });
    return created;
  });

  process.stdout.write(`Created demo workspace ${workspace.id} for ${DEMO_EMAIL}.\n`);
}

async function main(): Promise<void> {
  const demo = process.argv.includes("--demo");
  if (!demo) {
    process.stdout.write("Seed: nothing to do (pass --demo for demo data).\n");
    return;
  }
  await seedDemo();
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
