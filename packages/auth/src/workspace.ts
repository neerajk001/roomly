import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";

interface BootstrapUser {
  id: string;
  name: string;
}

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first === undefined || first === "" ? "Your" : first;
}

/**
 * Creates the personal workspace, OWNER membership and the signup credit
 * grant for a new user. Idempotent: does nothing if the user already owns a
 * workspace. The CreditLedger unique constraint on (reason, refId) makes the
 * credit grant safe against double execution even across retries.
 */
export async function bootstrapWorkspace(user: BootstrapUser): Promise<void> {
  const env = getServerEnv();
  const existing = await prisma.workspace.findFirst({
    where: { ownerId: user.id },
    select: { id: true },
  });
  if (existing !== null) {
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: `${firstName(user.name)}'s space`,
        type: "PERSONAL",
        ownerId: user.id,
      },
    });
    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });
    await tx.creditLedger.create({
      data: {
        workspaceId: workspace.id,
        delta: env.SIGNUP_FREE_CREDITS,
        reason: "SIGNUP_GRANT",
        refId: workspace.id,
        note: "Signup free credits",
      },
    });
    return workspace;
  });

  // Structured log; replaced by pino transport in V6 observability.
  // eslint-disable-next-line no-console -- structured server event log until the pino logger lands
  console.info(
    JSON.stringify({
      channel: "workspace",
      event: "bootstrap",
      workspaceId: created.id,
      type: created.type,
    }),
  );
}
