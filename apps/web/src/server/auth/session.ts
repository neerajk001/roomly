import { auth } from "@roomdesigner/auth/server";
import { prisma, type Workspace, type WorkspaceRole } from "@roomdesigner/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { AppError } from "../app-error";

export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/** Cached per request: session lookup with real cookie validation. */
export const getSession = cache(async (): Promise<Session | null> => {
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
