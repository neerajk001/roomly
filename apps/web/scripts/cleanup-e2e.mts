import { readFile } from "node:fs/promises";
import { prisma } from "@roomdesigner/db";
import { deleteObject } from "@roomdesigner/storage";
import { z } from "zod";

const manifest = new URL("../../../test-results/e2e-users.jsonl", import.meta.url);
const emailSchema = z.email().refine((email) => /^e2e-[a-z0-9-]+@example\.test$/.test(email));
let emails: string[] = [];
try {
  emails = (await readFile(manifest, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => emailSchema.parse(JSON.parse(line)));
} catch (error) {
  if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
}
try {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  for (const user of users) {
    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    for (const workspace of workspaces) {
      const assets = await prisma.asset.findMany({
        where: { workspaceId: workspace.id },
        select: { storageKey: true },
      });
      const proposals = await prisma.proposal.findMany({
        where: { project: { workspaceId: workspace.id } },
        select: { pdfStorageKey: true },
      });
      const keys = new Set(
        [
          ...assets.map((asset) => asset.storageKey),
          ...proposals.map((proposal) => proposal.pdfStorageKey),
        ].filter((key): key is string => key !== null),
      );
      for (const key of keys) await deleteObject(key);
      await prisma.$transaction(
        async (tx) => {
          await tx.proposal.deleteMany({ where: { project: { workspaceId: workspace.id } } });
          await tx.estimate.deleteMany({ where: { project: { workspaceId: workspace.id } } });
          await tx.renderOutput.deleteMany({ where: { job: { workspaceId: workspace.id } } });
          await tx.renderJob.deleteMany({ where: { workspaceId: workspace.id } });
          await tx.workspace.deleteMany({ where: { id: workspace.id, ownerId: user.id } });
        },
        { timeout: 30_000 },
      );
    }
    await prisma.user.deleteMany({ where: { id: user.id, email: { in: emails } } });
  }
  process.stdout.write(
    `Cleaned ${users.length} recorded E2E accounts and their test workspaces.\n`,
  );
} finally {
  await prisma.$disconnect();
}
