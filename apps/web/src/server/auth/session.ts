import { auth } from "@roomdesigner/auth/server";
import { bootstrapWorkspace } from "@roomdesigner/auth/workspace";
import { getServerEnv } from "@roomdesigner/config/env";
import { prisma, type User, type Workspace, type WorkspaceRole } from "@roomdesigner/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AppError } from "../app-error";

export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

const DEV_EMAIL = "dev@roomdesigner.local";

/** True only when explicitly enabled AND not running in production. */
export function isDevAuthBypassEnabled(): boolean {
  const env = getServerEnv();
  return env.NODE_ENV !== "production" && env.DEV_AUTH_BYPASS;
}

let devUserPromise: Promise<User> | undefined;

async function ensureDevUser(): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (existing !== null) {
    if (existing.onboardedAt == null) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { onboardedAt: new Date() },
      });
    }
    return existing;
  }
  const created = await prisma.user
    .create({
      data: {
        id: crypto.randomUUID(),
        name: "Dev User",
        email: DEV_EMAIL,
        emailVerified: true,
        mode: "HOME",
        onboardedAt: new Date(),
      },
    })
    .catch(async () => prisma.user.findUniqueOrThrow({ where: { email: DEV_EMAIL } }));
  await bootstrapWorkspace(created);
  return created;
}

function devSessionFor(user: User): Session {
  const now = new Date();
  // Shaped like Better Auth's session; the cast is safe because every field
  // Better Auth adds (user.mode/onboardedAt) exists on the Prisma user.
  return {
    session: {
      id: "dev-session",
      token: "dev-session-token",
      userId: user.id,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
    user,
  } as unknown as Session;
}

/** Cached per request: real session validation, or the dev bypass user. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (isDevAuthBypassEnabled()) {
    devUserPromise ??= ensureDevUser().catch((error: unknown) => {
      devUserPromise = undefined;
      throw error;
    });
    return devSessionFor(await devUserPromise);
  }
  return auth.api.getSession({ headers: await headers() });
});

/** Redirects to sign-in when there is no valid session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (session === null) {
    redirect("/sign-in");
  }
  return session;
}

export interface WorkspaceContext {
  user: Session["user"];
  workspace: Workspace;
  role: WorkspaceRole;
}

async function resolveMembership(session: Session) {
  return prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Resolves the caller's workspace from their membership. The workspace id is
 * never taken from the client. V1: exactly one workspace per user.
 */
export async function requireWorkspace(): Promise<WorkspaceContext> {
  const session = await requireSession();
  const membership = await resolveMembership(session);
  if (membership === null) {
    redirect("/onboarding");
  }
  return {
    user: session.user,
    workspace: membership.workspace,
    role: membership.role,
  };
}

/** API variant: throws 401/403 instead of redirecting. */
export async function requireApiWorkspace(): Promise<WorkspaceContext> {
  const session = await getSession();
  if (session === null) {
    throw new AppError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const membership = await resolveMembership(session);
  if (membership === null) {
    throw new AppError("NO_WORKSPACE", "Finish onboarding first.", 403);
  }
  return {
    user: session.user,
    workspace: membership.workspace,
    role: membership.role,
  };
}

/** Signed-in users who have not finished onboarding go to /onboarding. */
export async function requireOnboarded(): Promise<Session> {
  const session = await requireSession();
  if (session.user.onboardedAt == null) {
    redirect("/onboarding");
  }
  return session;
}

/** Guards credit-spending actions. */
export function requireVerifiedEmail(user: { emailVerified: boolean }): void {
  if (!user.emailVerified) {
    throw new AppError("EMAIL_NOT_VERIFIED", "Verify your email address first.", 403);
  }
}
