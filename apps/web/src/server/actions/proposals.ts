"use server";

import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { getEmailSender } from "@roomdesigner/shared/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "../auth/session";
import { AppError } from "../app-error";
import { createProposal, proposalInputSchema, sendProposal } from "../services/proposals";

export interface ProposalFormState {
  error?: string;
  notice?: string;
}

export async function createProposalAction(
  _prev: ProposalFormState,
  formData: FormData,
): Promise<ProposalFormState> {
  let options: unknown;
  try {
    options = JSON.parse(String(formData.get("options") ?? "[]"));
  } catch {
    return { error: "The options could not be read." };
  }
  const parsed = proposalInputSchema.safeParse({
    projectId: formData.get("projectId"),
    estimateId: formData.get("estimateId"),
    title: formData.get("title"),
    intro: formData.get("intro") ?? undefined,
    terms: formData.get("terms") ?? undefined,
    expiresInDays: Number(formData.get("expiresInDays") ?? 14),
    options,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the proposal." };
  }

  const { user, workspace } = await requireWorkspace();
  try {
    await createProposal(
      prisma,
      { userId: user.id, workspaceId: workspace.id },
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/studio/projects/${parsed.data.projectId}`);
  redirect(`/studio/projects/${parsed.data.projectId}`);
}

export async function sendProposalAction(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get("proposalId"));
  const projectId = z.string().min(1).parse(formData.get("projectId"));
  const { user, workspace } = await requireWorkspace();
  const { token } = await sendProposal(prisma, { userId: user.id, workspaceId: workspace.id }, id);

  const proposal = await prisma.proposal.findFirst({
    where: { id, project: { workspaceId: workspace.id } },
    select: {
      title: true,
      project: { select: { client: { select: { email: true, name: true } } } },
    },
  });
  const clientEmail = proposal?.project.client?.email;
  if (clientEmail !== undefined && clientEmail !== null) {
    void getEmailSender().send({
      to: clientEmail,
      subject: `Your design proposal: ${proposal?.title ?? ""}`,
      text: `Hi ${proposal?.project.client?.name ?? "there"},\n\nYour proposal is ready: ${getServerEnv().APP_URL}/p/${token}\n\nYou can approve an option or request changes there.\n`,
    });
  }

  revalidatePath(`/studio/projects/${projectId}`);
}
