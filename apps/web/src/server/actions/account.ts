"use server";

import { prisma } from "@roomdesigner/db";
import { logEvent } from "@roomdesigner/shared/logger";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/server/auth/session";
import { AppError } from "../app-error";

export interface AccountState {
  error?: string;
}

/** Deletes the user, their workspaces and all tenant data (DB cascade). */
export async function deleteAccountAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (confirmation !== "DELETE") {
    return { error: 'Type DELETE exactly to confirm.' };
  }

  const { user, workspace } = await requireWorkspace();
  const membershipCount = await prisma.workspaceMember.count({ where: { userId: user.id } });
  if (membershipCount > 1) {
    throw new AppError(
      "NOT_SUPPORTED",
      "Leave other workspaces before deleting your account.",
      409,
    );
  }

  await prisma.$transaction([
    prisma.creditLedger.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.proposal.deleteMany({ where: { project: { workspaceId: workspace.id } } }),
    prisma.estimate.deleteMany({ where: { project: { workspaceId: workspace.id } } }),
    prisma.renderJob.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.asset.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.room.deleteMany({ where: { project: { workspaceId: workspace.id } } }),
    prisma.project.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.client.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.rateCard.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.briefLink.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } }),
    prisma.workspace.deleteMany({ where: { id: workspace.id, ownerId: user.id } }),
    prisma.user.deleteMany({ where: { id: user.id } }),
  ]);

  logEvent("info", "account_deleted", { workspaceId: workspace.id });
  revalidatePath("/");
  redirect("/");
}
